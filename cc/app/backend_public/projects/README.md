````md
# CC Promotional Ad Service for Velo by Wix

A backend service for a **Velo Wix SaaS website** that powers:

- secure intake submission to **n8n webhooks**
- dynamic pain point loading for onboarding and strategy forms
- retry-safe webhook delivery
- simple webhook configuration checks
- service health ping responses

This module is designed for Wix SaaS workflows where the frontend collects structured business information and sends it to an external automation layer for processing, enrichment, routing, or content generation.

---

## Overview

The **CC Promotional Ad Service** acts as a middleware layer between your Wix frontend and one or more external automation endpoints.

It exposes five public web methods:

1. `sendToWebhook(payload)`
   - Sends a full intake payload to the main n8n webhook
   - Includes retry logic and structured error handling

2. `getPainPoints(payload)`
   - Fetches dynamic pain points from a pain point webhook
   - Falls back to default pain points if the webhook fails or returns unusable data

3. `validateWebhookConnection()`
   - Verifies that the main webhook secret is configured

4. `validatePainPointWebhook()`
   - Verifies that the pain point webhook secret is configured

5. `ping()`
   - Returns a simple service health response

---

## Primary Use Case

This service is a strong fit for Wix SaaS onboarding and promotional ad workflows where the user submits a form containing data such as:

- company name
- business category
- business subcategory
- customer base
- geographic info
- selected pain points
- strategic inputs
- intake metadata

The frontend uses this backend module to:

- submit complete intake data to an automation pipeline
- dynamically load pain point choices for a selected business context
- degrade gracefully if the remote service is unavailable
- confirm whether infrastructure is configured correctly

---

## File Location

Place the module in your Velo backend directory as a web module:

```js
backend/ccPromotionalAdService.web.js
````

---

## Source Code

```js
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
```

---

## Core Responsibilities

This service handles three main jobs:

### 1. Intake submission

It forwards a full submission payload from your Wix frontend to an external webhook.

### 2. Dynamic pain point retrieval

It requests targeted pain points from a pain point webhook based on business context.

### 3. Resilience and diagnostics

It includes retry logic, fallback behavior, and lightweight health checks so the frontend is less dependent on perfect webhook availability.

---

## Architecture

Typical workflow:

```text
Wix Frontend Form
    ↓
ccPromotionalAdService.web.js
    ↓
Wix Secrets Manager
    ↓
Main n8n Webhook / Pain Point Webhook
    ↓
Automation / Processing / Storage / Content Generation
```

A more detailed intake flow may look like this:

```text
Visitor completes SaaS intake form
    ↓
Frontend collects payload
    ↓
sendToWebhook(payload)
    ↓
Main webhook receives submission
    ↓
n8n validates + routes + stores + triggers automations
```

Pain point flow:

```text
User selects business category + customer base
    ↓
Frontend calls getPainPoints(payload)
    ↓
Pain point webhook returns dynamic list
    ↓
Service normalizes result
    ↓
Frontend displays selectable options
```

If the pain point webhook fails:

```text
Webhook unavailable / empty / invalid
    ↓
Service returns DEFAULT_PAIN_POINTS
    ↓
Frontend remains usable
```

---

## Exported Web Methods

All exported methods are currently configured with:

```js
Permissions.Anyone
```

That means they can be called from the frontend without member authentication. This may be appropriate for public intake flows, but it should be reviewed for production security.

### Methods exposed

* `sendToWebhook(payload)`
* `getPainPoints(payload)`
* `validateWebhookConnection()`
* `validatePainPointWebhook()`
* `ping()`

---

## Secrets Required

This service depends on two Wix secrets.

### `CC_WEBHOOK_URL`

The primary submission webhook used by `sendToWebhook()`.

### `CC_PAINPOINT`

The webhook used by `getPainPoints()` and validated by `validatePainPointWebhook()`.

### Example values

```text
CC_WEBHOOK_URL=https://your-n8n-domain.com/webhook/content-creator-intake
CC_PAINPOINT=https://your-n8n-domain.com/webhook/content-creator-painpoints
```

Store these in **Wix Secrets Manager**.

---

## Retry Strategy

The module is designed to be more resilient than a single-attempt webhook call.

### Configuration

```js
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 10000];
const RETRYABLE_STATUSES = [429, 502, 503, 504];
const RETRYABLE_ERRORS = [
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'socket hang up',
  'network timeout'
];
```

### How retries work

For retryable failures, the service:

1. detects a retryable HTTP status or network error
2. waits before retrying
3. adds jitter to reduce burst collisions
4. retries up to `MAX_RETRIES`

### Retryable HTTP statuses

* `429 Too Many Requests`
* `502 Bad Gateway`
* `503 Service Unavailable`
* `504 Gateway Timeout`

### Retryable network errors

* connection reset
* timeout
* DNS lookup issues
* transient socket/network interruptions

### Jitter logic

A small random offset is applied to the delay so multiple retries do not happen in an identical timing pattern.

---

## Default Pain Point Fallback

If the pain point webhook is unavailable, invalid, or returns unusable data, the service returns this fallback list:

```json
[
  {
    "label": "Authenticity & Trust Deficit: Overcoming AI fatigue and proving you're real",
    "value": "authenticity-trust-deficit"
  },
  {
    "label": "Decision Fatigue & Choice Overload: Helping customers choose faster with confidence",
    "value": "decision-fatigue-choice-overload"
  },
  {
    "label": "Economic Caution & ROI Anxiety: Justifying value and preventing buyer’s remorse",
    "value": "economic-caution-roi-anxiety"
  },
  {
    "label": "Ad Fatigue & Digital Noise: Standing out in a cluttered feed",
    "value": "ad-fatigue-digital-noise"
  },
  {
    "label": "Privacy & Data Mistrust: Building trust through transparency and permission",
    "value": "privacy-data-mistrust"
  },
  {
    "label": "Buying Friction & Checkout Drop-Off: Reducing steps between interest and purchase",
    "value": "buying-friction-checkout-drop-off"
  },
  {
    "label": "Sustainability & Ethical Skepticism: Addressing environmental and moral concerns",
    "value": "sustainability-ethical-skepticism"
  },
  {
    "label": "Community & Belonging Gap: Turning audiences into engaged insiders",
    "value": "community-belonging-gap"
  }
]
```

This ensures the frontend always has usable options.

---

## Method Documentation

## `sendToWebhook(payload)`

Sends a submission payload to the main webhook with retry logic and structured error handling.

### Input

Any JSON-serializable object. The service expects a payload that may include a `submissionId`.

### Common payload example

```json
{
  "submissionId": "sub_001",
  "companyName": "Half Moon Star Bazar",
  "businessCategory": "health-and-beauty",
  "businessSubcategory": "personal-care",
  "customerBase": "b2c",
  "selectedPainPoints": [
    "authenticity-trust-deficit",
    "ad-fatigue-digital-noise"
  ],
  "zip": "48104"
}
```

### Example frontend usage

```js
import { sendToWebhook } from 'backend/ccPromotionalAdService.web';

const result = await sendToWebhook({
  submissionId: 'sub_001',
  companyName: 'Half Moon Star Bazar',
  businessCategory: 'health-and-beauty',
  businessSubcategory: 'personal-care',
  customerBase: 'b2c',
  selectedPainPoints: ['authenticity-trust-deficit']
});

console.log(result);
```

### Request headers sent to the webhook

```http
Content-Type: application/json
X-CC-Source: wix-cc-promotional-ad
X-CC-Contract-Version: 1
X-Request-Id: <submissionId or generated request id>
```

### Success response example

```json
{
  "ok": true,
  "status": 200,
  "duplicate": false,
  "receiptId": "rcpt_123",
  "submissionId": "sub_001",
  "data": {
    "receiptId": "rcpt_123",
    "submissionId": "sub_001"
  }
}
```

### Duplicate response behavior

If the webhook returns:

```json
{
  "duplicate": true
}
```

the service surfaces that in:

```json
{
  "duplicate": true
}
```

### Non-retryable error response example

```json
{
  "ok": false,
  "status": 400,
  "statusText": "Bad Request",
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "Missing required field",
    "fields": ["companyName"]
  }
}
```

### Retry exhaustion response example

```json
{
  "ok": false,
  "status": 503,
  "statusText": "Service Unavailable",
  "error": {
    "type": "INTAKE_FAILURE",
    "message": "Webhook temporarily unavailable after multiple retries"
  }
}
```

### Behavior notes

* Retries happen only for retryable statuses and retryable network errors.
* Non-retryable errors return immediately.
* The method does not throw to the frontend in normal failure cases; it returns a structured result object.

---

## `getPainPoints(payload)`

Fetches dynamic pain points from a pain point webhook.

If the webhook fails or returns invalid data, the method returns `DEFAULT_PAIN_POINTS`.

### Input

The payload is forwarded as received. It may include fields such as:

* `businessCategory`
* `businessSubcategory`
* `customerBase`
* `zip`
* `companyName`

### Example payload

```json
{
  "businessCategory": "retail-and-shopping",
  "businessSubcategory": "bicycle-store",
  "customerBase": "b2c-business-to-consumer",
  "zip": "48104",
  "companyName": "Downtown Cycle Co."
}
```

### Example frontend usage

```js
import { getPainPoints } from 'backend/ccPromotionalAdService.web';

const result = await getPainPoints({
  businessCategory: 'retail-and-shopping',
  businessSubcategory: 'bicycle-store',
  customerBase: 'b2c-business-to-consumer',
  zip: '48104',
  companyName: 'Downtown Cycle Co.'
});

console.log(result.options);
```

### Expected success response

```json
{
  "options": [
    {
      "label": "Foot traffic is inconsistent",
      "value": "foot-traffic-is-inconsistent"
    },
    {
      "label": "High comparison shopping behavior",
      "value": "high-comparison-shopping-behavior"
    }
  ]
}
```

### Supported webhook response formats

The service tries to normalize the pain point webhook response.

#### Format A: array of objects

```json
[
  { "label": "Low trust", "value": "low-trust" }
]
```

#### Format B: array of strings

```json
[
  "Low trust",
  "High competition"
]
```

This becomes:

```json
[
  { "label": "Low trust", "value": "low-trust" },
  { "label": "High competition", "value": "high-competition" }
]
```

#### Format C: wrapped object

```json
{
  "options": [
    "Low trust",
    "High competition"
  ]
}
```

or

```json
{
  "options": [
    { "label": "Low trust", "value": "low-trust" }
  ]
}
```

### Fallback response

If anything goes wrong:

```json
{
  "options": [
    {
      "label": "Authenticity & Trust Deficit: Overcoming AI fatigue and proving you're real",
      "value": "authenticity-trust-deficit"
    }
  ]
}
```

### Behavior notes

* Missing `CC_PAINPOINT` secret immediately triggers defaults.
* Non-retryable webhook errors immediately trigger defaults.
* Retryable errors attempt retries before falling back.
* Empty or malformed responses also trigger defaults.

---

## `validateWebhookConnection()`

Checks whether the main webhook secret exists.

### Example usage

```js
import { validateWebhookConnection } from 'backend/ccPromotionalAdService.web';

const result = await validateWebhookConnection();
console.log(result);
```

### Success response

```json
{
  "configured": true,
  "ready": true
}
```

### Failure response

```json
{
  "configured": false,
  "ready": false,
  "error": "Webhook URL not configured"
}
```

### Important note

This method does **not** perform a live network call to the webhook.
It only confirms that the secret is present.

---

## `validatePainPointWebhook()`

Checks whether the pain point webhook secret exists.

### Example usage

```js
import { validatePainPointWebhook } from 'backend/ccPromotionalAdService.web';

const result = await validatePainPointWebhook();
console.log(result);
```

### Success response

```json
{
  "configured": true,
  "ready": true
}
```

### Failure response

```json
{
  "configured": false,
  "ready": false,
  "error": "Pain point webhook URL not configured"
}
```

### Important note

This also only validates secret presence, not live endpoint reachability.

---

## `ping()`

Simple health response for quick service checks.

### Example usage

```js
import { ping } from 'backend/ccPromotionalAdService.web';

const result = await ping();
console.log(result);
```

### Example response

```json
{
  "status": "ok",
  "timestamp": "2026-03-14T12:00:00.000Z",
  "service": "ccPromotionalAdService",
  "version": "2.6.2"
}
```

---

## Frontend Integration Examples

### Example 1: submit intake form

```js
import { sendToWebhook } from 'backend/ccPromotionalAdService.web';

export async function submitIntake() {
  const payload = {
    submissionId: `sub-${Date.now()}`,
    companyName: $w('#companyName').value,
    businessCategory: $w('#businessCategory').value,
    businessSubcategory: $w('#businessSubcategory').value,
    customerBase: $w('#customerBase').value,
    zip: $w('#zip').value,
    selectedPainPoints: $w('#painPoints').value,
    submittedAt: new Date().toISOString()
  };

  const result = await sendToWebhook(payload);

  if (result.ok) {
    console.log('Submission accepted:', result);
  } else {
    console.error('Submission failed:', result.error);
  }
}
```

### Example 2: load dynamic pain points

```js
import { getPainPoints } from 'backend/ccPromotionalAdService.web';

export async function refreshPainPoints() {
  const result = await getPainPoints({
    businessCategory: $w('#businessCategory').value,
    businessSubcategory: $w('#businessSubcategory').value,
    customerBase: $w('#customerBase').value,
    zip: $w('#zip').value,
    companyName: $w('#companyName').value
  });

  $w('#painPointsDropdown').options = result.options.map(item => ({
    label: item.label,
    value: item.value
  }));
}
```

### Example 3: admin diagnostics

```js
import {
  ping,
  validateWebhookConnection,
  validatePainPointWebhook
} from 'backend/ccPromotionalAdService.web';

export async function runDiagnostics() {
  const pingResult = await ping();
  const mainWebhook = await validateWebhookConnection();
  const painPointWebhook = await validatePainPointWebhook();

  console.log({
    pingResult,
    mainWebhook,
    painPointWebhook
  });
}
```

---

## Logging

The module logs extensively for diagnostics.

### Logged events include

* service and version markers
* submission IDs
* payload keys
* attempt counts
* sanitized webhook base URLs
* request headers
* response status codes
* parsed response data
* retry waits
* secret lookup failures
* fallback pain point usage

This helps trace:

* bad configuration
* malformed payloads
* transient network issues
* webhook outages
* retry behavior

---

## Security Considerations

### 1. Public permissions

All methods use:

```js
Permissions.Anyone
```

This is convenient for public intake flows, but it also means anonymous visitors can call them from the frontend.

For stricter production setups, consider:

* `Permissions.SiteMember`
* authenticated member flows
* backend authorization checks
* rate limiting upstream

### 2. Secret storage

Webhook URLs are stored in Wix Secrets Manager, which is the correct pattern for keeping infrastructure endpoints out of source code.

### 3. Logged payload keys

The service logs payload keys, not the full payload body, which is good. Still, review logs periodically to ensure no sensitive fields are leaking through other console output.

### 4. No outbound authentication

The comment says:

```js
Send submission to n8n webhook – no authentication.
```

That means the webhook itself may be publicly reachable unless you secure it separately. Consider:

* signed requests
* secret token headers
* n8n authentication
* IP restrictions where appropriate

---

## Error Handling Model

### `sendToWebhook()`

Returns structured failure objects rather than always throwing.

Possible failure types include:

* `REQUEST_FAILED`
* `NETWORK_ERROR`
* `INTAKE_FAILURE`

### `getPainPoints()`

Never hard-fails the frontend in most cases. It uses safe defaults.

### Validation methods

Return simple `{ configured, ready, error }` objects.

### `ping()`

Always returns a lightweight service status object unless the platform itself fails to execute the function.

---

## Suggested Webhook Contracts

### Main submission webhook recommended response

```json
{
  "receiptId": "rcpt_123",
  "submissionId": "sub_001",
  "duplicate": false
}
```

### Pain point webhook recommended response

Preferred format:

```json
[
  { "label": "Low trust", "value": "low-trust" },
  { "label": "Weak differentiation", "value": "weak-differentiation" }
]
```

Also supported:

```json
{
  "options": [
    { "label": "Low trust", "value": "low-trust" }
  ]
}
```

---

## Troubleshooting

### Problem: `sendToWebhook()` says webhook URL not configured

Cause:

* `CC_WEBHOOK_URL` secret is missing or empty

Fix:

* add or update the secret in Wix Secrets Manager

### Problem: `getPainPoints()` always returns default options

Possible causes:

* `CC_PAINPOINT` secret missing
* webhook returning invalid JSON shape
* webhook returning empty array
* webhook timing out
* webhook returning a non-retryable error

### Problem: retries are happening often

Cause:

* the remote webhook may be throttling or unstable

Check:

* `429`, `502`, `503`, `504` responses
* DNS or timeout errors
* n8n service health

### Problem: `validateWebhookConnection()` says ready but requests still fail

Cause:

* the method only confirms secret presence, not real endpoint health

Fix:

* test the actual webhook outside the app
* add a true live validation endpoint if needed

### Problem: duplicate submissions

Cause:

* frontend retries or repeat user clicks
* upstream deduplication logic responding with `duplicate: true`

Fix:

* disable repeated submits on the frontend
* use consistent `submissionId` values
* handle duplicate receipts explicitly

---

## Recommended Enhancements

### Add true endpoint health validation

Current validation methods only check if secrets exist. A future improvement would be to perform a lightweight authenticated ping to the actual webhook.

### Add request timeout handling for `sendToWebhook()`

The current fetch retry logic is strong, but there is no explicit `AbortController` timeout in this version.

### Add payload validation

Validate required fields before sending to the webhook to reduce avoidable 4xx failures.

### Add response schema checks

Enforce stricter validation on webhook responses before returning them.

### Add rate limiting or abuse protection

Because methods are public, upstream protections are worth considering.

### Add environment metadata

Helpful for debugging across dev, staging, and production:

```js
environment: 'production'
```

---

## Version

Current service metadata:

```text
Service: ccPromotionalAdService
Version: 2.6.2
```

---

## Summary

The **CC Promotional Ad Service** is a resilient Velo backend module for Wix SaaS applications that:

* submits structured intake payloads to n8n
* fetches dynamic pain points with safe fallbacks
* retries transient failures automatically
* checks secret-based webhook readiness
* exposes a lightweight ping endpoint

It is well suited for onboarding, intake, promotional ad generation, and automation-driven SaaS experiences where reliability matters and the frontend must remain usable even when external services are imperfect.

```
```
