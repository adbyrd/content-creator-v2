# Pain Point Service for Velo by Wix

A backend service for a **Velo Wix SaaS website** that powers dynamic pain-point selection, intake submission, webhook testing, and service health checks using **Wix Web Modules**, **Wix Secrets Manager**, and external **n8n webhooks**.

This service is designed for intake-driven SaaS workflows where the frontend needs to:

- load relevant pain points based on business context
- gracefully fall back to safe defaults when the API fails
- submit full intake payloads to automation pipelines
- test webhook connectivity
- verify backend health and secret configuration

---

## Overview

This module exposes four public web methods:

1. `getPainPoints(input)`
   - Fetches context-aware pain points from an n8n webhook
   - Falls back to a predefined list if the webhook fails, times out, or returns empty data

2. `submitCcIntakeToN8n(payload)`
   - Sends a full intake payload from the frontend to an n8n webhook

3. `healthCheck()`
   - Checks whether the service is operational and whether secrets are configured

4. `testWebhook(testParams)`
   - Sends a test request to the configured pain point webhook for debugging and verification

---

## What This Service Solves

In many Wix SaaS intake flows, the frontend depends on external automation to generate dynamic option sets such as:

- customer pain points
- offer challenges
- growth bottlenecks
- marketing friction
- business problems by industry and audience

This service acts as a backend-safe middleware layer between the Wix frontend and n8n.

It provides:

- secure secret handling
- logging and observability
- timeout protection
- normalized response formatting
- resilient fallback behavior

---

## File Location

Place this module in your Velo backend web module directory:

```js
backend/painPointService.web.js
````

---

## Source Code

```js
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
```

---

## Core Features

### Dynamic pain point loading

The service can fetch pain points from an external automation workflow using industry and audience context.

### Fallback-first design

If the webhook fails, times out, returns empty results, or required parameters are missing, the service still returns a usable fallback list.

### Secret-based webhook configuration

Webhook URLs are stored securely in Wix Secrets Manager rather than hardcoded into source files.

### Timeout protection

Webhook calls are wrapped with `AbortController` to prevent the frontend from hanging indefinitely.

### Response normalization

The service accepts either string arrays or object arrays from the external API and normalizes them to a consistent format:

```json
[
  { "label": "Low trust / low credibility", "value": "low-trust-low-credibility" }
]
```

### Debug and observability support

The service includes structured logging, health checks, and webhook test functions.

---

## Architecture

Typical flow:

```text
Wix Frontend
    ↓
painPointService.web.js
    ↓
Wix Secrets Manager
    ↓
n8n Webhook
    ↓
AI / Logic / Data Processing
    ↓
Normalized Pain Point Response
    ↓
Frontend Form / Intake UI
```

A second path supports full intake submission:

```text
Wix Frontend Intake Form
    ↓
submitCcIntakeToN8n()
    ↓
n8n Intake Webhook
    ↓
Automation / CRM / Content Creation / Notifications
```

---

## Exposed Web Methods

This module exposes the following web methods with:

```js
Permissions.Anyone
```

That means they are callable from the frontend. For production environments, review whether public access is appropriate.

### Exported methods

* `getPainPoints(input)`
* `submitCcIntakeToN8n(payload)`
* `healthCheck()`
* `testWebhook(testParams)`

---

## Helper Functions

### `slugify(s)`

Converts a label into a URL-safe slug.

Example:

```js
slugify('Low trust / low credibility')
// "low-trust-low-credibility"
```

### `normalizeOptions(list)`

Converts incoming API data into a consistent `{ label, value }` format.

Supported input examples:

```js
['Low trust', 'High CAC']
```

becomes:

```js
[
  { label: 'Low trust', value: 'low-trust' },
  { label: 'High CAC', value: 'high-cac' }
]
```

And:

```js
[
  { label: 'Low trust', value: 'low-trust' },
  { name: 'High CAC', slug: 'high-cac' }
]
```

becomes:

```js
[
  { label: 'Low trust', value: 'low-trust' },
  { label: 'High CAC', value: 'high-cac' }
]
```

### `postJson(url, body, options)`

Internal utility for POSTing JSON to a webhook with:

* timeout support
* logging
* non-JSON response handling
* error wrapping

Default timeout:

```js
10000 // 10 seconds
```

Optional override example:

```js
await postJson(url, payload, { timeout: 15000 });
```

---

## Fallback Pain Points

If the external API fails or returns no usable data, the service returns this fallback list:

```json
[
  { "label": "Not enough consistent traffic", "value": "not-enough-consistent-traffic" },
  { "label": "Customers don't understand the offer", "value": "customers-dont-understand-offer" },
  { "label": "Low trust / low credibility", "value": "low-trust-low-credibility" },
  { "label": "Competition feels overwhelming", "value": "competition-overwhelming" },
  { "label": "High customer acquisition cost", "value": "high-customer-acquisition-cost" },
  { "label": "Low customer retention", "value": "low-customer-retention" },
  { "label": "Inefficient operations/processes", "value": "inefficient-operations-processes" },
  { "label": "Lack of brand awareness", "value": "lack-of-brand-awareness" }
]
```

---

## Secrets Required

Configure the following secrets in **Wix Secrets Manager**.

### 1. `N8N_PAINPOINT_WEBHOOK_URL`

Used by:

* `getPainPoints()`
* `healthCheck()`
* `testWebhook()`

### 2. `N8N_CC_INTAKE_WEBHOOK_URL`

Used by:

* `submitCcIntakeToN8n()`

---

## Example Secret Values

```text
N8N_PAINPOINT_WEBHOOK_URL=https://your-n8n-instance.com/webhook/pain-points
N8N_CC_INTAKE_WEBHOOK_URL=https://your-n8n-instance.com/webhook/content-creator-intake
```

Do not hardcode webhook URLs in frontend or backend source files when secrets can be used instead.

---

## Method Documentation

## `getPainPoints(input)`

Fetches pain point options for a selected business context.

### Input

```js
{
  parentSlug: string,
  subSlug: string,
  customerBase: string
}
```

### Example

```js
import { getPainPoints } from 'backend/painPointService.web';

const result = await getPainPoints({
  parentSlug: 'retail-and-shopping',
  subSlug: 'bicycle-store',
  customerBase: 'b2c-business-to-consumer'
});
```

### Webhook request payload

```json
{
  "parentSlug": "retail-and-shopping",
  "subSlug": "bicycle-store",
  "customerBase": "b2c-business-to-consumer"
}
```

### Successful API response shape

```json
{
  "options": [
    { "label": "Seasonality affects sales", "value": "seasonality-affects-sales" },
    { "label": "Foot traffic is inconsistent", "value": "foot-traffic-is-inconsistent" }
  ],
  "version": "v4.1.0",
  "source": "api",
  "metadata": {
    "urlCalled": true,
    "responseTime": "842ms",
    "hasData": true,
    "itemCount": 2,
    "requestId": "abc1234"
  }
}
```

### Fallback response shape

```json
{
  "options": [
    { "label": "Not enough consistent traffic", "value": "not-enough-consistent-traffic" }
  ],
  "version": "v4.1.0",
  "source": "fallback",
  "metadata": {
    "urlCalled": false,
    "responseTime": "4ms",
    "hasData": true,
    "reason": "missing_data",
    "error": "No data returned from webhook",
    "parameters": {
      "parentSlug": "",
      "subSlug": "",
      "customerBase": ""
    },
    "requestId": "xyz7890"
  }
}
```

### Behavior notes

* If all three parameters are present, the service attempts to call the webhook.
* If parameters are missing, the service skips the webhook and still returns fallback options.
* If the webhook errors, the service returns fallback options.
* If the webhook returns empty or invalid data, the service returns fallback options.

### Source values

The `source` field indicates where the options came from:

* `api` → live webhook response
* `fallback` → predefined local fallback list

---

## `submitCcIntakeToN8n(payload)`

Submits a full intake object to the intake webhook.

### Input

Any JSON-serializable object from the frontend intake flow.

### Example

```js
import { submitCcIntakeToN8n } from 'backend/painPointService.web';

const result = await submitCcIntakeToN8n({
  companyName: 'Half Moon Star Bazar',
  parentSlug: 'retail-and-shopping',
  subSlug: 'health-and-beauty-store',
  customerBase: 'b2c-business-to-consumer',
  selectedPainPoints: [
    'lack-of-brand-awareness',
    'low-trust-low-credibility'
  ],
  notes: 'Need stronger positioning and better content strategy'
});
```

### Success response

```json
{
  "ok": true,
  "n8n": {
    "received": true
  }
}
```

### Failure response

```json
{
  "ok": false,
  "error": "Webhook timeout after 10000ms",
  "submittedAt": "2026-03-14T12:00:00.000Z"
}
```

### Notes

* This method does not throw errors back to the frontend in its current implementation.
* It returns a structured success/failure object instead.

---

## `healthCheck()`

Checks whether the pain point service is up and whether the core secret is configured.

### Example

```js
import { healthCheck } from 'backend/painPointService.web';

const status = await healthCheck();
console.log(status);
```

### Success response

```json
{
  "ok": true,
  "timestamp": "2026-03-14T12:00:00.000Z",
  "secretsConfigured": true,
  "urlLength": 73,
  "service": "painPointService.web v4.1.0"
}
```

### Failure response

```json
{
  "ok": false,
  "timestamp": "2026-03-14T12:00:00.000Z",
  "error": "Secret not found",
  "service": "painPointService.web v4.1.0"
}
```

### What it checks

* whether `N8N_PAINPOINT_WEBHOOK_URL` can be read
* whether it is non-empty

It does not actually call the webhook.

---

## `testWebhook(testParams)`

Sends a live test request to the pain point webhook.

### Default parameters

If no parameters are passed, the method uses:

```json
{
  "parentSlug": "retail-and-shopping",
  "subSlug": "bicycle-store",
  "customerBase": "b2c-business-to-consumer"
}
```

### Example

```js
import { testWebhook } from 'backend/painPointService.web';

const result = await testWebhook({
  parentSlug: 'professional-services',
  subSlug: 'marketing-agency',
  customerBase: 'b2b-business-to-business'
});
```

### Success response

```json
{
  "ok": true,
  "response": {
    "painPoints": [
      { "label": "Clients do not understand the value", "value": "clients-do-not-understand-value" }
    ]
  },
  "params": {
    "parentSlug": "professional-services",
    "subSlug": "marketing-agency",
    "customerBase": "b2b-business-to-business"
  },
  "timestamp": "2026-03-14T12:00:00.000Z"
}
```

### Failure response

```json
{
  "ok": false,
  "error": "n8n webhook failed: 500 Internal Server Error",
  "timestamp": "2026-03-14T12:00:00.000Z"
}
```

---

## Frontend Usage Examples

### Example: Load pain points for a form

```js
import { getPainPoints } from 'backend/painPointService.web';

$w.onReady(async () => {
  const result = await getPainPoints({
    parentSlug: 'retail-and-shopping',
    subSlug: 'bicycle-store',
    customerBase: 'b2c-business-to-consumer'
  });

  const dropdownOptions = result.options.map((item) => ({
    label: item.label,
    value: item.value
  }));

  $w('#painPointDropdown').options = dropdownOptions;
});
```

### Example: Submit full intake after user completes form

```js
import { submitCcIntakeToN8n } from 'backend/painPointService.web';

export async function submitForm() {
  const payload = {
    companyName: $w('#companyName').value,
    parentSlug: $w('#parentCategory').value,
    subSlug: $w('#subCategory').value,
    customerBase: $w('#customerBase').value,
    selectedPainPoints: $w('#painPoints').value,
    createdAt: new Date().toISOString()
  };

  const result = await submitCcIntakeToN8n(payload);

  if (result.ok) {
    console.log('Intake submitted successfully');
  } else {
    console.error('Submission failed:', result.error);
  }
}
```

### Example: Admin-only diagnostic screen

```js
import { healthCheck, testWebhook } from 'backend/painPointService.web';

async function runDiagnostics() {
  const health = await healthCheck();
  console.log('Health:', health);

  const test = await testWebhook();
  console.log('Webhook test:', test);
}
```

---

## Logging and Observability

The service logs:

* unique request IDs
* webhook call attempts
* URL length
* response time
* content type
* response status
* whether fallback was used
* normalized item counts
* error type and message

This makes it easier to debug:

* bad secrets
* empty webhook responses
* timeouts
* malformed JSON
* partial frontend inputs

---

## Timeout Behavior

The internal `postJson()` helper uses `AbortController`.

### Default timeouts

* `postJson()` default: `10000ms`
* `getPainPoints()` webhook call: `15000ms`
* `testWebhook()` call: `10000ms`

### Timeout error example

```text
Webhook timeout after 15000ms
```

---

## Response Normalization Rules

The service accepts multiple response formats from n8n.

### Supported webhook response formats

#### Option A: `painPoints`

```json
{
  "painPoints": [
    "Low trust",
    "Weak positioning"
  ]
}
```

#### Option B: `options`

```json
{
  "options": [
    { "label": "Low trust", "value": "low-trust" }
  ]
}
```

#### Option C: objects with `name` and `slug`

```json
{
  "painPoints": [
    { "name": "Low trust", "slug": "low-trust" }
  ]
}
```

All valid formats are normalized to:

```json
[
  { "label": "Low trust", "value": "low-trust" }
]
```

---

## Error Handling Strategy

This service is intentionally resilient.

### `getPainPoints()`

Does not fail hard for most scenarios. Instead it returns fallback options.

Fallback is triggered when:

* secrets cannot be loaded
* webhook URL is missing
* required parameters are missing
* webhook times out
* webhook returns a non-OK status
* webhook returns empty data
* normalization results in zero valid options

### `submitCcIntakeToN8n()`

Returns:

* `{ ok: true, n8n: ... }` on success
* `{ ok: false, error: ... }` on failure

### `healthCheck()`

Returns a structured object with `ok: true` or `ok: false`.

### `testWebhook()`

Returns a structured diagnostic result.

---

## Security Considerations

### Public method permissions

All methods currently use:

```js
Permissions.Anyone
```

That may be acceptable for a public intake experience, but you should review whether each method truly needs public access.

Potential production alternatives:

* `Permissions.SiteMember`
* custom access control via frontend rules
* admin-only testing UI
* separate internal-only diagnostic methods

### Secret management

Webhook URLs are pulled from Wix Secrets Manager, which is the correct pattern for:

* hiding infrastructure endpoints
* keeping environment-specific values out of source control
* preventing frontend exposure

### Logging caution

The code logs request details and URL previews. In production, be careful not to log sensitive customer information or personally identifiable data unnecessarily.

---

## Suggested n8n Response Contract

For the most reliable integration, have your pain point webhook return:

```json
{
  "painPoints": [
    { "label": "Customers don’t understand the offer", "value": "customers-dont-understand-offer" },
    { "label": "Low trust / low credibility", "value": "low-trust-low-credibility" }
  ],
  "version": "v4.1.0"
}
```

This keeps the frontend consistent and reduces transformation issues.

---

## Recommended Enhancements

### 1. Add input validation

Currently, missing values are allowed so fallback behavior works. You may still want to validate field types and length.

### 2. Add caching

If the same category combinations are requested often, caching responses could reduce webhook usage.

### 3. Add authentication for diagnostics

`healthCheck()` and `testWebhook()` may be useful only for internal staff.

### 4. Add analytics

Track:

* fallback rate
* timeout rate
* most requested category combinations
* most selected pain points

### 5. Add environment tags

Useful in logs:

```js
environment: 'production'
```

### 6. Add schema versioning

Return a `schemaVersion` field so frontend updates can be coordinated cleanly.

---

## Troubleshooting

### Problem: Always getting fallback results

Possible causes:

* webhook secret missing
* webhook timing out
* webhook returning empty array
* webhook returning data in an unsupported format

Check:

* `healthCheck()`
* `testWebhook()`
* backend logs

### Problem: `urlCalled` is false

Cause:

* one or more of `parentSlug`, `subSlug`, or `customerBase` was missing
* secret was unavailable before the webhook could be called

### Problem: `source` is `fallback`

Cause:

* webhook error
* empty response
* bad response format
* missing input values

### Problem: Intake submission returns `ok: false`

Cause:

* bad `N8N_CC_INTAKE_WEBHOOK_URL`
* timeout
* non-200 webhook response
* malformed payload expectations downstream

### Problem: `healthCheck()` says `secretsConfigured: false`

Cause:

* `N8N_PAINPOINT_WEBHOOK_URL` is empty or missing

---

## Version

Current service version reported in code:

```text
painPointService.web v4.1.0
```

---

## Example Project Use Case

This service is a strong fit for SaaS experiences such as:

* guided business assessments
* onboarding funnels
* marketing strategy intake forms
* AI-driven content planning
* niche audience profiling
* dynamic questionnaire generation

Example flow:

1. user selects business category
2. user selects subcategory
3. user selects customer base
4. frontend calls `getPainPoints()`
5. service returns live or fallback options
6. user completes intake
7. frontend submits full payload with `submitCcIntakeToN8n()`
8. n8n routes data into content, CRM, automation, or AI workflows

---

## License

Use internally or adapt for your Wix SaaS architecture.

---

## Summary

The **Pain Point Service** is a resilient backend module for Velo by Wix that:

* securely reads webhook URLs from Secrets Manager
* calls n8n webhooks with timeout protection
* normalizes external response data
* supplies safe fallback pain points when live data is unavailable
* supports full intake submission workflows
* includes health and testing utilities for diagnostics

It is well-suited for SaaS platforms that need dynamic form intelligence without making the frontend depend directly on external automation reliability.