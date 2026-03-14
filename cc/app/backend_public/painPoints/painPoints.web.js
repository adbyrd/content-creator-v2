/**
 * PAIN POINT SERVICE - WEB MODULE
 * Version: 4.1.0
 */

import { webMethod, Permissions } from 'wix-web-module';
import { fetch } from 'wix-fetch';
import { getSecret } from 'wix-secrets-backend';

// Fallback pain points for when the API fails or returns empty
const FALLBACK_PAIN_POINTS = [
  { label: 'Not enough consistent traffic', value: 'not-enough-consistent-traffic' },
  { label: 'Customers don\'t understand the offer', value: 'customers-dont-understand-offer' },
  { label: 'Low trust / low credibility', value: 'low-trust-low-credibility' },
  { label: 'Competition feels overwhelming', value: 'competition-overwhelming' },
  { label: 'High customer acquisition cost', value: 'high-customer-acquisition-cost' },
  { label: 'Low customer retention', value: 'low-customer-retention' },
  { label: 'Inefficient operations/processes', value: 'inefficient-operations-processes' },
  { label: 'Lack of brand awareness', value: 'lack-of-brand-awareness' }
];

function slugify(s) {
  return (s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function normalizeOptions(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((x) => {
      if (typeof x === 'string') return { label: x, value: slugify(x) };
      const label = (x.label || x.name || '').toString().trim();
      const value = (x.value || x.slug || slugify(label)).toString().trim();
      if (!label || !value) return null;
      return { label, value };
    })
    .filter(Boolean);
}

/**
 * Enhanced POST function with detailed logging and timeout
 */
async function postJson(url, body, options = {}) {
  const { timeout = 10000 } = options; // 10 second default timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const requestId = Math.random().toString(36).substring(2, 9);
  
  console.log(`[PainPointService] [${requestId}] Calling webhook:`, {
    url: url ? `${url.substring(0, 60)}...` : 'URL_NOT_FOUND',
    body: { ...body, timestamp: new Date().toISOString() },
    timeout,
    urlLength: url?.length || 0
  });

  try {
    const startTime = Date.now();
    const res = await fetch(url, {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body || {}),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const responseTime = Date.now() - startTime;
    const responseText = await res.text();
    
    console.log(`[PainPointService] [${requestId}] Webhook response:`, {
      status: res.status,
      statusText: res.statusText,
      responseTime: `${responseTime}ms`,
      urlCalled: true, // ALWAYS TRUE IF WE REACH THIS POINT
      hasBody: !!(body && Object.keys(body).length > 0),
      responseLength: responseText.length,
      timestamp: new Date().toISOString()
    });

    if (!res.ok) {
      console.error(`[PainPointService] [${requestId}] Webhook failed:`, {
        status: res.status,
        statusText: res.statusText,
        response: responseText.substring(0, 500)
      });
      throw new Error(`n8n webhook failed: ${res.status} ${res.statusText}`);
    }

    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      console.log(`[PainPointService] [${requestId}] Non-JSON response received`);
      return { ok: true, receivedAt: new Date().toISOString() };
    }
    
    const json = JSON.parse(responseText);
    console.log(`[PainPointService] [${requestId}] JSON response structure:`, {
      hasPainPoints: !!(json.painPoints || json.options),
      painPointCount: (json.painPoints || json.options || []).length,
      version: json.version || 'unknown',
      keys: Object.keys(json)
    });
    
    return json;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`[PainPointService] [${requestId}] Webhook call failed:`, {
      errorName: error.name,
      errorMessage: error.message,
      url: url ? `${url.substring(0, 50)}...` : 'URL_NOT_FOUND',
      urlLength: url?.length || 0,
      timestamp: new Date().toISOString()
    });
    
    if (error.name === 'AbortError') {
      throw new Error(`Webhook timeout after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * getPainPoints - Enhanced with better error handling and fallbacks
 * input: { parentSlug, subSlug, customerBase }
 * output: { 
 *   options: [{label,value}], 
 *   version: string,
 *   source: 'api' | 'fallback' | 'error',
 *   metadata: { urlCalled: boolean, responseTime: string, hasData: boolean }
 * }
 */
export const getPainPoints = webMethod(Permissions.Anyone, async (input) => {
  const requestId = Math.random().toString(36).substring(2, 9);
  const callStartTime = Date.now();
  
  console.log(`[PainPointService] [${requestId}] getPainPoints called with:`, {
    parentSlug: input?.parentSlug,
    subSlug: input?.subSlug,
    customerBase: input?.customerBase,
    timestamp: new Date().toISOString(),
    inputKeys: Object.keys(input || {})
  });

  const parentSlug = (input?.parentSlug || '').toString().trim();
  const subSlug = (input?.subSlug || '').toString().trim();
  const customerBase = (input?.customerBase || '').toString().trim();

  // CRITICAL FIX: Don't return early if parameters are missing - the frontend expects fallback
  let urlCalled = false;
  let callError = null;
  let webhookResponse = null;

  try {
    // Get webhook URL from secrets
    console.log(`[PainPointService] [${requestId}] Fetching webhook URL from secrets...`);
    const url = await getSecret('N8N_PAINPOINT_WEBHOOK_URL');
    
    if (url && url.trim() !== '') {
      console.log(`[PainPointService] [${requestId}] Webhook URL retrieved, length:`, url.length);
      
      // Only call webhook if we have all required parameters
      if (parentSlug && subSlug && customerBase) {
        console.log(`[PainPointService] [${requestId}] Calling webhook with parameters:`, {
          parentSlug,
          subSlug,
          customerBase,
          urlPreview: `${url.substring(0, 80)}...`
        });
        
        try {
          // Call the webhook with proper timeout
          webhookResponse = await postJson(url, { 
            parentSlug, 
            subSlug, 
            customerBase 
          }, { timeout: 15000 });
          
          urlCalled = true;
        } catch (webhookError) {
          callError = webhookError;
          urlCalled = true; // URL WAS called, even if it failed
          console.error(`[PainPointService] [${requestId}] Webhook call failed:`, webhookError.message);
        }
      } else {
        console.log(`[PainPointService] [${requestId}] Missing parameters, skipping webhook call:`, {
          hasParentSlug: !!parentSlug,
          hasSubSlug: !!subSlug,
          hasCustomerBase: !!customerBase
        });
      }
    } else {
      console.error(`[PainPointService] [${requestId}] Webhook URL not found or empty in secrets`);
      callError = new Error('Webhook URL not configured in secrets manager');
    }
  } catch (secretError) {
    console.error(`[PainPointService] [${requestId}] Failed to get secret:`, secretError);
    callError = secretError;
  }

  // Extract and normalize pain points from webhook response
  if (webhookResponse && !callError) {
    const painPoints = webhookResponse.painPoints || webhookResponse.options || [];
    const normalizedOptions = normalizeOptions(painPoints);
    
    console.log(`[PainPointService] [${requestId}] Webhook response processed:`, {
      originalCount: painPoints.length,
      normalizedCount: normalizedOptions.length,
      hasData: normalizedOptions.length > 0,
      urlCalled
    });
    
    // Check if we got valid data
    if (normalizedOptions.length > 0) {
      console.log(`[PainPointService] [${requestId}] Successfully loaded pain points from API:`, {
        itemCount: normalizedOptions.length,
        sample: normalizedOptions.slice(0, 3)
      });
      
      return {
        options: normalizedOptions,
        version: webhookResponse.version || 'v4.1.0',
        source: 'api',
        metadata: {
          urlCalled: true,
          responseTime: `${Date.now() - callStartTime}ms`,
          hasData: true,
          itemCount: normalizedOptions.length,
          requestId
        }
      };
    }
  }

  // If we reach here, use fallback
  console.log(`[PainPointService] [${requestId}] Using fallback pain points:`, {
    urlCalled,
    hasError: !!callError,
    errorMessage: callError?.message,
    webhookResponse: !!webhookResponse,
    parametersPresent: { parentSlug, subSlug, customerBase }
  });
  
  return {
    options: FALLBACK_PAIN_POINTS,
    version: 'v4.1.0',
    source: 'fallback',
    metadata: {
      urlCalled: urlCalled,
      responseTime: `${Date.now() - callStartTime}ms`,
      hasData: true,
      reason: callError ? 'error_fallback' : 'missing_data',
      error: callError?.message || 'No data returned from webhook',
      parameters: { parentSlug, subSlug, customerBase },
      requestId
    }
  };
});

/**
 * submitCcIntakeToN8n
 * payload: the full intake payload from the frontend
 * output: { ok: true, n8n: <response> }
 */
export const submitCcIntakeToN8n = webMethod(Permissions.Anyone, async (payload) => {
  try {
    const url = await getSecret('N8N_CC_INTAKE_WEBHOOK_URL');
    console.log('[PainPointService] Submitting intake to n8n:', {
      payloadKeys: Object.keys(payload || {}),
      urlLength: url?.length || 0,
      timestamp: new Date().toISOString()
    });
    
    const n8nRes = await postJson(url, payload);
    return { ok: true, n8n: n8nRes };
  } catch (error) {
    console.error('[PainPointService] Intake submission failed:', error);
    return { 
      ok: false, 
      error: error.message,
      submittedAt: new Date().toISOString()
    };
  }
});

/**
 * Health check function to verify service is working
 */
export const healthCheck = webMethod(Permissions.Anyone, async () => {
  try {
    const url = await getSecret('N8N_PAINPOINT_WEBHOOK_URL');
    return {
      ok: true,
      timestamp: new Date().toISOString(),
      secretsConfigured: !!url && url.trim().length > 0,
      urlLength: url?.length || 0,
      service: 'painPointService.web v4.1.0'
    };
  } catch (error) {
    return {
      ok: false,
      timestamp: new Date().toISOString(),
      error: error.message,
      service: 'painPointService.web v4.1.0'
    };
  }
});

/**
 * Test webhook call with specific parameters
 */
export const testWebhook = webMethod(Permissions.Anyone, async (testParams) => {
  try {
    const url = await getSecret('N8N_PAINPOINT_WEBHOOK_URL');
    
    if (!url || url.trim() === '') {
      return {
        ok: false,
        error: 'No webhook URL configured in secrets',
        timestamp: new Date().toISOString()
      };
    }
    
    const params = testParams || {
      parentSlug: 'retail-and-shopping',
      subSlug: 'bicycle-store',
      customerBase: 'b2c-business-to-consumer'
    };
    
    console.log('[PainPointService] Testing webhook with:', params);
    
    const response = await postJson(url, params, { timeout: 10000 });
    
    return {
      ok: true,
      response: response,
      params: params,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
});