/***************************************************************************************************
 * Piranha Engine (GUEST) v.1.2.0
 * Content Creator 2.0 
 **************************************************************************************************/

import { getSecret } from 'wix-secrets-backend';
import { fetch } from 'wix-fetch';
import { webMethod, Permissions } from 'wix-web-module';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 10000]; // ms
const RETRYABLE_STATUSES = [429, 502, 503, 504];
const RETRYABLE_ERRORS = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'socket hang up', 'network timeout'];

// Default pain points (fallback)
const DEFAULT_PAIN_POINTS = [
  { label: 'Authenticity & Trust Deficit: Overcoming AI fatigue and proving you\'re real', value: 'authenticity-trust-deficit' },
  { label: 'Decision Fatigue & Choice Overload: Helping customers choose faster with confidence', value: 'decision-fatigue-choice-overload' },
  { label: 'Economic Caution & ROI Anxiety: Justifying value and preventing buyer’s remorse', value: 'economic-caution-roi-anxiety' },
  { label: 'Ad Fatigue & Digital Noise: Standing out in a cluttered feed', value: 'ad-fatigue-digital-noise' },
  { label: 'Privacy & Data Mistrust: Building trust through transparency and permission', value: 'privacy-data-mistrust' },
  { label: 'Buying Friction & Checkout Drop-Off: Reducing steps between interest and purchase', value: 'buying-friction-checkout-drop-off' },
  { label: 'Sustainability & Ethical Skepticism: Addressing environmental and moral concerns', value: 'sustainability-ethical-skepticism' },
  { label: 'Community & Belonging Gap: Turning audiences into engaged insiders', value: 'community-belonging-gap' }
];

/**
 * Send submission to n8n webhook – no authentication.
 */
export const sendToWebhook = webMethod(Permissions.Anyone, async (payload) => {
  console.log('[backend v2.6.2] ========== sendToWebhook called ==========');
  console.log('[backend] Submission ID:', payload.submissionId);
  console.log('[backend] Payload keys:', Object.keys(payload));

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[backend] Attempt ${attempt}/${MAX_RETRIES} – fetching secret CC_WEBHOOK_URL...`);
      const webhookUrl = await getSecret('CC_WEBHOOK_URL');
      if (!webhookUrl) {
        console.error('[backend] ❌ Secret CC_WEBHOOK_URL not found or empty');
        throw new Error('Webhook URL not configured in secrets');
      }
      // Log URL without query parameters for privacy
      const urlBase = webhookUrl.split('?')[0];
      console.log(`[backend] Secret retrieved, webhook base URL: ${urlBase}`);

      const headers = {
        'Content-Type': 'application/json',
        'X-CC-Source': 'wix-cc-promotional-ad',
        'X-CC-Contract-Version': '1',
        'X-Request-Id': payload.submissionId || `req-${Date.now()}`
      };
      console.log('[backend] Request headers:', headers);

      console.log(`[backend] Making fetch request to webhook (attempt ${attempt})...`);
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      console.log(`[backend] Fetch completed – status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        console.log('[backend] Response OK, parsing JSON...');
        const responseData = await response.json().catch(() => ({}));
        console.log('[backend] Parsed response data:', responseData);

        console.log(`[backend] ✅ Webhook success (attempt ${attempt})`);
        return {
          ok: true,
          status: response.status,
          duplicate: responseData.duplicate === true,
          receiptId: responseData.receiptId,
          submissionId: responseData.submissionId,
          data: responseData
        };
      }

      const shouldRetry = RETRYABLE_STATUSES.includes(response.status);
      const statusText = response.statusText;

      if (!shouldRetry) {
        console.warn(`[backend] Non-retryable error (${response.status}) – not retrying`);
        let errorBody;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = { error: { message: await response.text() } };
        }
        console.error('[backend] Error body:', errorBody);

        return {
          ok: false,
          status: response.status,
          statusText,
          error: {
            type: errorBody.error?.type || 'REQUEST_FAILED',
            message: errorBody.error?.message || statusText,
            fields: errorBody.error?.fields
          }
        };
      }

      console.warn(`[backend] Retryable status ${response.status}, attempt ${attempt} will retry after ${RETRY_DELAYS[attempt - 1]}ms`);
      lastError = { status: response.status, statusText };

    } catch (error) {
      console.error(`[backend] ❌ Webhook fetch error (attempt ${attempt}):`, error.message);
      if (error.code) console.error('[backend] Error code:', error.code);

      const isRetryable = RETRYABLE_ERRORS.some(
        pattern => error.message.includes(pattern) || error.code?.includes(pattern)
      );

      if (!isRetryable) {
        console.warn('[backend] Non-retryable error, returning immediately');
        return {
          ok: false,
          status: 0,
          statusText: 'Request Failed',
          error: {
            type: 'NETWORK_ERROR',
            message: error.message
          }
        };
      }

      console.warn('[backend] Retryable error, will retry');
      lastError = error;
    }

    if (attempt < MAX_RETRIES) {
      const baseDelay = RETRY_DELAYS[attempt - 1];
      const jitter = baseDelay * 0.2 * (Math.random() * 2 - 1);
      const delay = Math.max(0, baseDelay + jitter);
      console.log(`[backend] Waiting ${delay.toFixed(0)}ms before next retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.error('[backend] ❌ All retries exhausted, returning failure');
  return {
    ok: false,
    status: lastError?.status || 0,
    statusText: lastError?.statusText || 'Max retries exceeded',
    error: {
      type: 'INTAKE_FAILURE',
      message: lastError?.message || 'Webhook temporarily unavailable after multiple retries'
    }
  };
});

/**
 * Fetch dynamic pain points based on business category, subcategory, customer base, zip, and company name.
 * The payload now includes companyName (added in frontend) and is forwarded as received.
 */
export const getPainPoints = webMethod(Permissions.Anyone, async (payload) => {
  console.log('[backend v2.6.2] getPainPoints called with params:', payload);

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const webhookUrl = await getSecret('CC_PAINPOINT');
      if (!webhookUrl) {
        console.warn('[backend] CC_PAINPOINT secret not configured, using default pain points');
        return { options: DEFAULT_PAIN_POINTS };
      }

      const headers = {
        'Content-Type': 'application/json',
        'X-CC-Source': 'wix-cc-promotional-ad',
        'X-Request-Id': `painpoint-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      };

      console.log(`[backend] Pain point attempt ${attempt}/${MAX_RETRIES} to:`, webhookUrl.replace(/\?.*$/, ''));
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      console.log(`[backend] Pain point response status: ${response.status}`);

      if (response.ok) {
        const responseData = await response.json();
        console.log('[backend] Raw pain point response:', responseData);

        // Normalize response to array of { label, value }
        let options = [];
        if (Array.isArray(responseData)) {
          if (responseData.length > 0) {
            // Check if first element is already an object with label & value
            const first = responseData[0];
            if (typeof first === 'object' && first !== null && 'label' in first && 'value' in first) {
              options = responseData; // already correct format
            } else {
              // Assume array of strings – convert each to { label, value }
              options = responseData.map(item => ({
                label: String(item),
                value: String(item).toLowerCase().replace(/\s+/g, '-')
              }));
            }
          }
        } else if (typeof responseData === 'object' && responseData !== null && responseData.options) {
          // Handle { options: [...] } wrapper
          const raw = responseData.options;
          if (Array.isArray(raw)) {
            if (raw.length > 0 && typeof raw[0] === 'object') {
              options = raw;
            } else {
              options = raw.map(item => ({
                label: String(item),
                value: String(item).toLowerCase().replace(/\s+/g, '-')
              }));
            }
          }
        }

        if (options.length === 0) {
          console.warn('[backend] No valid pain points received, using defaults');
          options = DEFAULT_PAIN_POINTS;
        }

        console.log(`[backend] Pain point success (attempt ${attempt}), returning ${options.length} options`);
        return { options };
      }

      const shouldRetry = RETRYABLE_STATUSES.includes(response.status);
      if (!shouldRetry) {
        console.error(`[backend] Non-retryable error (${response.status}) from pain point webhook, using default`);
        return { options: DEFAULT_PAIN_POINTS };
      }

      console.warn(`[backend] Retryable status ${response.status} on pain point, attempt ${attempt} will retry`);
      lastError = { status: response.status };

    } catch (error) {
      console.error(`[backend] Pain point fetch error (attempt ${attempt}):`, error.message);

      const isRetryable = RETRYABLE_ERRORS.some(
        pattern => error.message.includes(pattern) || error.code?.includes(pattern)
      );

      if (!isRetryable) {
        console.warn('[backend] Non-retryable error, using default pain points');
        return { options: DEFAULT_PAIN_POINTS };
      }

      lastError = error;
    }

    if (attempt < MAX_RETRIES) {
      const baseDelay = RETRY_DELAYS[attempt - 1];
      const jitter = baseDelay * 0.2 * (Math.random() * 2 - 1);
      const delay = Math.max(0, baseDelay + jitter);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.warn('[backend] All retries exhausted for pain points, using default');
  return { options: DEFAULT_PAIN_POINTS };
});

/**
 * Validate main webhook connectivity – simplified.
 */
export const validateWebhookConnection = webMethod(Permissions.Anyone, async () => {
  try {
    const webhookUrl = await getSecret('CC_WEBHOOK_URL');
    if (!webhookUrl) {
      return {
        configured: false,
        ready: false,
        error: 'Webhook URL not configured'
      };
    }

    return {
      configured: true,
      ready: true
    };
  } catch (error) {
    console.error('[backend] Validate webhook error:', error.message);
    return {
      configured: false,
      ready: false,
      error: error.message
    };
  }
});

/**
 * Validate pain point webhook connectivity.
 */
export const validatePainPointWebhook = webMethod(Permissions.Anyone, async () => {
  try {
    const webhookUrl = await getSecret('CC_PAINPOINT');
    if (!webhookUrl) {
      return {
        configured: false,
        ready: false,
        error: 'Pain point webhook URL not configured'
      };
    }

    return {
      configured: true,
      ready: true
    };
  } catch (error) {
    console.error('[backend] Validate pain point webhook error:', error.message);
    return {
      configured: false,
      ready: false,
      error: error.message
    };
  }
});

// Simple ping
export const ping = webMethod(Permissions.Anyone, async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  service: 'ccPromotionalAdService',
  version: '2.6.2'
}));