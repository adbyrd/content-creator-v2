# Wix Velo Development Standards & Best Practices

## A Guide for Full Stack Developers

This document outlines the coding standards, architectural patterns, and best practices used in the **Piranha Engine** and its associated services. It serves as a reference for new Wix Velo developers to build robust, maintainable, and production‑ready pages and backend modules.

---

## 1. Overview

The codebase consists of:

- **Frontend Page Code** (`piranha-guest.js`) – a multi‑step wizard that collects business information, validates input, and submits to backend services.
- **Backend Web Modules** (`piranhaGuest.web.js`, `painPoints.web.js`) – handle business logic, external API calls (webhooks), secrets management, and retry policies.

All code follows these principles:

- **Defensive programming** – validate inputs, provide fallbacks, handle errors gracefully.
- **User‑centric** – clear error messages, loading states, and feedback.
- **Maintainable** – modular functions, consistent naming, extensive logging.
- **Secure** – secrets stored in Wix Secrets Manager, no hard‑coded credentials.

---

## 2. Project Structure

```
Page Code (public/)
├── piranha-guest.js          # Main frontend logic (multi‑step form)

Backend (backend/)
├── piranhaGuest.web.js       # Core backend service: submission, pain points, validation
├── painPoints.web.js         # Specialised service for dynamic pain points (legacy)
└── ... (other modules)
```

All backend modules use `.web.js` extension and export functions via `webMethod`.

---

## 3. Coding Standards

### Naming Conventions
- **Variables/functions**: `camelCase`  
  ```javascript
  let validationState = {...};
  function validateCurrentStep() {...}
  ```
- **Constants**: `UPPER_SNAKE_CASE`  
  ```javascript
  const SUBMISSIONS_COLLECTION = 'UniversalIntakeSubmissions';
  const MAX_RETRIES = 3;
  ```
- **Selectors/IDs**: Match HTML IDs, e.g., `#ccCompanyName`, `#ccErrorEmail`.
- **Private variables**: Prefix with underscore `_` (e.g., `_taxonomyCache`).

### Comments
- Use block comments for file headers and major sections.
- Inline comments for non‑obvious logic.
- `console.log` statements should include a prefix with module/version, e.g., `[cc-v7.9.0]`.

### Logging
- Always log key actions, errors, and state changes.
- Include timestamps and unique request IDs in backend logs for traceability.
- Example:
  ```javascript
  console.log(`[backend] Attempt ${attempt}/${MAX_RETRIES} – fetching secret...`);
  console.error(`[cc-v7.9.0] Taxonomy load failed:`, err);
  ```

---

## 4. Frontend Page Code Guidelines

### 4.1 Initialization (`$w.onReady`)
- Bootstrap the UI (`bootUI`).
- Resolve wizard states (`resolveWizardStates`).
- Set up event handlers (`wire...` functions).
- Load external data with retry logic (`hydrateTaxonomyWithRetry`).
- Check backend connectivity (`checkWebhookConnections`, `checkCollectionExists`).
- Hydrate URL parameters (`hydrateAttributionFromQuery`).

### 4.2 State Management
- Use module‑level variables for shared state (e.g., `_taxonomyCache`, `_mainWebhookStatus`).
- Keep UI state separate (e.g., `validationState`, `currentStepIndex`).

### 4.3 Safe UI Manipulation
Because elements may not exist in all steps, use helper functions that check existence:

```javascript
function safeDisable(selector, disabled = true) {
  const el = $w(selector);
  if (!el) return;
  // handle different element types
}
```

Similar helpers: `safeShow`, `safeHide`, `safeSetOptions`, `safeCollapse`, `safeExpand`.

### 4.4 Validation
- Validate step‑by‑step (`validateCurrentStep`) and final submission (`validateAllForSubmit`).
- Return detailed validation results: `{ isValid, message, errorFields, failedField }`.
- Use `validateRequired` and `validateCheckbox`.
- Show errors near the relevant field using collapsible `<p>` elements.

### 4.5 Wizard Navigation
- Maintain an array of step IDs (`STEP_STATE_IDS`).
- `switchToStep` handles:
  - Changing the state box.
  - Enabling/disabling navigation buttons.
  - Initialising new steps (e.g., enabling dropdowns, resetting pain points).
- Never hard‑code step indices; use the array.

### 4.6 Dynamic Data Loading
- Use async functions with retries (see backend section for retry logic).
- Show loading indicators (e.g., `#ccLoadingPainPoints`).
- Fallback to default data if loading fails.

Example: fetching pain points after customer base selection:
```javascript
async function fetchPainPoints(params) {
  try {
    const result = await getPainPoints(params);
    populatePainPointDropdown(result.options);
  } catch {
    populatePainPointDropdown(DEFAULT_PAIN_POINTS);
    showError('Could not load custom pain points. Using default options.');
  }
}
```

### 4.7 Webhook Integration
- Check webhook status on load (`checkWebhookConnections`).
- Store status in global variables (e.g; `_mainWebhookStatus`, `_painPointWebhookStatus`).
- Use these statuses to conditionally call webhooks and inform the user.

### 4.8 Form Submission (`handleSubmit`)
1. Generate a unique `submissionId`.
2. Build payload (`buildSubmissionPayload`).
3. Store in Wix Data (with fallback collection).
4. Call main webhook (`sendToWebhook`) with retry logic (handled in backend).
5. Show success/error overlay.
6. Reset form on success.

### 4.9 Attribution
Parse query parameters (`utm_*`, `ref`) and include them in the payload.

### 4.10 Debug Exports
Export functions that can be called from browser console for debugging (e.g., `debugTaxonomy`, `debugWebhookStatus`). This greatly aids support.

---

## 5. Backend Web Module Guidelines

### 5.1 `webMethod` and Permissions
- Always wrap exported functions with `webMethod(Permissions.Anyone, async (...) => {...})`.
- Use `Permissions.Anyone` for endpoints called from frontend; restrict to `Permissions.Admin` for internal tools.

### 5.2 Secrets Management
- Never hard‑code URLs or API keys.
- Use `getSecret('SECRET_NAME')` from `wix-secrets-backend`.
- Always handle missing secrets gracefully (log, fallback, return error).

### 5.3 Fetch with Retries and Timeouts
Implement a robust fetch with:
- Exponential backoff with jitter.
- Timeout using `AbortController`.
- Retry on specific HTTP statuses (`429, 502, 503, 504`) and network errors (`ECONNRESET`, `ETIMEDOUT`, etc.).
- Log each attempt.

Example pattern (from `piranhaGuest.web.js`):
```javascript
for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
  try {
    const response = await fetch(url, { ... });
    if (response.ok) { /* success */ }
    if (!RETRYABLE_STATUSES.includes(response.status)) { /* fail fast */ }
  } catch (error) {
    if (!isRetryableError(error)) { /* fail fast */ }
  }
  await delayWithJitter(attempt);
}
```

### 5.4 Error Handling and Fallbacks
- Always return a structured response, even on error.
- Include `ok: true/false`, status, error details.
- For critical services (like pain points), provide fallback data if the webhook fails.

Example response:
```javascript
return {
  ok: false,
  status: 503,
  error: { type: 'INTAKE_FAILURE', message: 'Webhook temporarily unavailable' }
};
```

### 5.5 Logging
- Include a `requestId` (generated per call) to correlate logs.
- Log request parameters, response status, timing.
- Be careful not to log full URLs with query parameters that may contain sensitive data; log base URL only.

### 5.6 Response Structure
- For `getPainPoints`, return `{ options: [...] }`.
- For submission webhook, return `{ ok: true, duplicate?: boolean, receiptId?: string, data?: any }`.

### 5.7 Health Checks
Provide a simple `ping` or `healthCheck` endpoint that returns status and version. Useful for monitoring.

---

## 6. Common Patterns and Utilities

### 6.1 Retry Logic (Backend)
- Constants: `MAX_RETRIES`, `RETRY_DELAYS`, `RETRYABLE_STATUSES`, `RETRYABLE_ERRORS`.
- Delay with jitter to avoid thundering herd.

### 6.2 Fallback Data
Always have a fallback (e.g., `DEFAULT_PAIN_POINTS`) to ensure the UI remains functional even when external services fail.

### 6.3 Humanizing Slugs
Functions like `humanizeSlug`, `getCategoryLabel`, `getCustomerBaseLabel` convert internal slugs to user‑friendly labels. Keep them in a central utility module if used across pages.

### 6.4 Normalizing Options
When receiving data from external APIs, normalise to `{ label, value }` format. This decouples the frontend from external data shapes.

Example:
```javascript
function normalizeOptions(list) {
  return list.map(item => ({
    label: item.label || item.name || String(item),
    value: item.value || item.slug || slugify(item.label || item.name || String(item))
  }));
}
```

---

## 7. Error Messages and User Communication

- Define user‑facing messages as constants at the top of the file (e.g., `MSG_WEBHOOK_ERROR`).
- Use a central `showError` function that:
  - Displays a general error message.
  - Expands specific field error elements.
  - Optionally auto‑hides after a delay.
- Never expose raw technical errors to the user.

---

## 8. Testing and Debugging

- Use the exported debug functions from the frontend to inspect state.
- Backend functions can be tested via Wix's API Explorer or by calling them from browser console if exported as `webMethod`.
- Simulate webhook failures by temporarily removing secrets or using a non‑existent URL.

---

## 9. Versioning and Updates

- Include a version string in file headers and in logs (e.g., `[cc-v7.9.0]`).
- When making breaking changes to the payload contract, increment `contractVersion` and handle both versions if necessary.

---

## 10. Security Considerations

- **Permissions**: Never use `Permissions.Anyone` for functions that modify data without proper checks. For submission webhooks, we assume they are idempotent and protected by the webhook endpoint itself.
- **Secrets**: Store all sensitive information in Wix Secrets Manager.
- **Input Validation**: Validate on frontend and backend. The backend should never trust frontend data.
- **Rate Limiting**: Not implemented in these examples, but consider adding checks for excessive submissions.

---

## 11. Conclusion

Adhering to these standards ensures that new pages and services are:

- **Reliable** – through fallbacks, retries, and comprehensive error handling.
- **Maintainable** – via modular code, consistent naming, and extensive logging.
- **User‑friendly** – with clear messaging and smooth UI transitions.
- **Secure** – by leveraging Wix's built‑in security features and best practices.

When extending this system, follow the patterns demonstrated in the provided files. If in doubt, refer to the existing code – it is designed to be a blueprint for future development.

---

*Document version: 1.0 – Last updated: 2025-03-14*