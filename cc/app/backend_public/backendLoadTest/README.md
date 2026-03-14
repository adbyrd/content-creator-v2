# Parametric Image Export Service (Velo by Wix)

Backend service for a **Wix Velo SaaS application** that sends user prompts to an external automation pipeline (such as **n8n**) to generate images.  
The service securely retrieves secrets, triggers a webhook, and manages request status inside a Wix database collection.

This module acts as the **control layer between the Wix frontend and an external rendering engine** (AI image generation, render farm, automation pipeline, etc.).

---

# Overview

The **Parametric Image Export Service** performs three core responsibilities:

1. **Secure Secret Retrieval**
   - Loads webhook URL and authentication secrets from Wix Secrets Manager.

2. **Image Generation Request Dispatch**
   - Sends a prompt and request ID to an external webhook (typically **n8n**).

3. **Database State Management**
   - Updates request status in the `UserImages` collection if a failure occurs.

---

# Architecture

Typical SaaS flow:

```

User → Wix Frontend
│
▼
exportImage() Web Method
│
▼
Wix Backend
│
▼
n8n Webhook
│
▼
Image Generation Pipeline
│
▼
Callback to Wix (image receiver endpoint)
│
▼
Database updated with completed image

```

---

# Module Location

Place the service inside:

```

backend/parametricService.js

```

or

```

backend/modules/parametricService.js

````

depending on your project structure.

---

# Source Code

```javascript
import { fetch } from 'wix-fetch';
import { getSecret } from 'wix-secrets-backend';
import { webMethod, Permissions } from 'wix-web-module';
import wixData from 'wix-data';

console.log('[parametricService] Module loaded – version 2.1.0');

async function getSecrets() {
    try {
        const webhookUrl = await getSecret('CC_EXPORT_IMAGE');
        const clientId = await getSecret('CLIENT_ID');
        const clientSecret = await getSecret('CLIENT_SECRET');
        const projectId = await getSecret('PROJECT_ID');

        console.log('[parametricService] Secrets retrieved:', {
            webhookUrl: webhookUrl ? 'present' : 'missing',
            clientId: clientId ? 'present' : 'missing',
            clientSecret: clientSecret ? 'present' : 'missing',
            projectId: projectId ? 'present' : 'missing'
        });

        return { webhookUrl, clientId, clientSecret, projectId };
    } catch (error) {
        console.error('[parametricService] Secret retrieval failed:', error.message);
        throw new Error(`Secret retrieval failed: ${error.message}`);
    }
}

export const exportImage = webMethod(Permissions.Anyone, async ({ prompt, requestId }) => {
    console.log('[cc-v1.0.0] - Backend: exportImage called with', { prompt, requestId });
    try {
        const { webhookUrl } = await getSecrets();

        const payload = { prompt, requestId };

        const response = await fetch(webhookUrl, {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log(`[cc-v1.0.0] - Backend: Webhook response status ${response.status}`);

        if (response.ok) {
            const responseText = await response.text();
            console.log('[cc-v1.0.0] - Backend: Webhook succeeded');
            return { success: true, status: response.status, body: responseText };
        } else {
            const errorText = await response.text();
            console.error('[cc-v1.0.0] - Backend: Webhook error', response.status, errorText);

            try {
                await wixData.update('UserImages', requestId, { status: 'failed' });
                console.log('[cc-v1.0.0] - Record marked as failed:', requestId);
            } catch (updateError) {
                console.error('[cc-v1.0.0] - Failed to update record to failed:', updateError);
            }

            throw new Error(`Webhook responded with ${response.status}: ${errorText}`);
        }
    } catch (error) {
        console.error('[cc-v1.0.0] - Backend: Exception in exportImage', error);

        if (requestId) {
            try {
                await wixData.update('UserImages', requestId, { status: 'failed' });
                console.log('[cc-v1.0.0] - Record marked as failed due to exception:', requestId);
            } catch (updateError) {
                console.error('[cc-v1.0.0] - Failed to update record to failed:', updateError);
            }
        }

        throw error;
    }
});

export const checkWebhookStatus = webMethod(Permissions.Anyone, async () => {
    console.log('[cc-v1.0.0] - Backend: checkWebhookStatus called');

    const status = {
        configured: false,
        details: null,
        error: null,
        lastCheck: new Date().toISOString(),
        ready: false,
        testPassed: false
    };

    try {
        const { webhookUrl, clientId, clientSecret, projectId } = await getSecrets();

        status.configured = true;
        status.details = {
            webhookUrl: webhookUrl ? 'present' : 'missing',
            clientId: clientId ? 'present' : 'missing',
            clientSecret: clientSecret ? 'present' : 'missing',
            projectId: projectId ? 'present' : 'missing'
        };

        if (webhookUrl) {
            const testPayload = [{ test: true, action: 'status_check' }];

            const response = await fetch(webhookUrl, {
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testPayload)
            });

            if (response.ok) {
                status.ready = true;
                status.testPassed = true;
            } else {
                status.error = `Webhook responded with status ${response.status}`;
                const errorText = await response.text();
                status.details = { ...status.details, responseError: errorText.substring(0, 200) };
            }
        } else {
            status.error = 'Webhook URL secret missing';
        }
    } catch (error) {
        status.error = error.message;
    }

    console.log('[cc-v1.0.0] - Backend: checkWebhookStatus result', status);
    return status;
});
````

---

# Web Methods

The service exposes **two backend web methods**.

## `exportImage()`

Primary function used by the frontend to start an image generation request.

### Permission

```
Permissions.Anyone
```

Accessible from the Wix frontend.

---

### Parameters

| Field       | Type   | Required | Description                            |
| ----------- | ------ | -------- | -------------------------------------- |
| `prompt`    | string | yes      | Text prompt used to generate the image |
| `requestId` | string | yes      | `_id` of the record in `UserImages`    |

---

### Example Frontend Call

```javascript
import { exportImage } from 'backend/parametricService';

const result = await exportImage({
  prompt: "cyberpunk city skyline at sunset",
  requestId: "abc123"
});

console.log(result);
```

---

### Payload Sent to Webhook

```json
{
  "prompt": "cyberpunk city skyline",
  "requestId": "abc123"
}
```

---

### Successful Response

```json
{
  "success": true,
  "status": 200,
  "body": "ok"
}
```

---

### Failure Handling

If the webhook fails or throws an exception:

The database record will be updated:

```
status = "failed"
```

---

# `checkWebhookStatus()`

Utility method that verifies:

* secret configuration
* webhook connectivity
* webhook response health

---

### Example Frontend Call

```javascript
import { checkWebhookStatus } from 'backend/parametricService';

const status = await checkWebhookStatus();

console.log(status);
```

---

### Example Response

```json
{
  "configured": true,
  "ready": true,
  "testPassed": true,
  "details": {
    "webhookUrl": "present",
    "clientId": "present",
    "clientSecret": "present",
    "projectId": "present"
  },
  "lastCheck": "2026-03-14T12:00:00Z"
}
```

---

# Secrets Configuration

The service retrieves secrets from **Wix Secrets Manager**.

Add the following secrets in the Wix dashboard.

| Secret Name       | Description                |
| ----------------- | -------------------------- |
| `CC_EXPORT_IMAGE` | n8n webhook endpoint       |
| `CLIENT_ID`       | External service client ID |
| `CLIENT_SECRET`   | External service secret    |
| `PROJECT_ID`      | Project identifier         |

---

## Example Webhook Secret

```
https://automation.yourdomain.com/webhook/cc-export-image
```

---

# Database Requirements

The service expects a Wix Data collection:

```
UserImages
```

---

## Suggested Schema

| Field       | Type     | Purpose                      |
| ----------- | -------- | ---------------------------- |
| `_id`       | Text     | Unique request ID            |
| `prompt`    | Text     | Original user prompt         |
| `status`    | Text     | pending / completed / failed |
| `imageUrl`  | URL      | Generated image              |
| `createdAt` | DateTime | Request timestamp            |
| `updatedAt` | DateTime | Last update                  |

---

## Request Lifecycle

```
pending
   ↓
processing
   ↓
completed
   ↓
failed
```

---

# Logging

The module logs important system events.

Example logs:

```
[parametricService] Module loaded – version 2.1.0
[cc-v1.0.0] Backend: exportImage called
[cc-v1.0.0] Backend: Webhook succeeded
```

---

# Error Handling

The service handles three failure scenarios:

### Secret retrieval failure

```
Secret retrieval failed
```

### Webhook error

```
Webhook responded with status 500
```

### Runtime exception

```
Exception in exportImage
```

Each failure attempts to update:

```
UserImages.status = "failed"
```

---

# Recommended Workflow

### Step 1 — Create Request

Frontend creates record:

```json
{
  "_id": "abc123",
  "prompt": "futuristic city",
  "status": "pending"
}
```

---

### Step 2 — Trigger Export

Frontend calls:

```
exportImage()
```

---

### Step 3 — n8n Processing

n8n pipeline:

```
Webhook Trigger
     ↓
AI Image Generator
     ↓
Upload Image
     ↓
Send callback to Wix
```

---

### Step 4 — Wix Callback

Image receiver endpoint saves:

```
imageUrl
status = completed
```

---

# Security Considerations

### 1. Secrets Protection

All credentials stored in:

```
Wix Secrets Manager
```

Never expose secrets in frontend code.

---

### 2. Web Method Permissions

Current configuration:

```
Permissions.Anyone
```

For production SaaS platforms consider:

```
Permissions.SiteMember
```

---

### 3. Webhook Validation

Consider adding:

* API key verification
* signed webhook payloads
* origin validation

---

### 4. Rate Limiting

Prevent abuse by limiting request frequency per user.

---

# Troubleshooting

### Webhook returns 404

Check:

```
CC_EXPORT_IMAGE secret
```

---

### Status shows "missing"

One or more secrets are not configured.

---

### Record not updated

Verify:

```
UserImages collection exists
```

and the `_id` matches `requestId`.

---

# Version

```
parametricService v2.1.0
```

---

# Recommended Improvements

### Queue-based processing

Introduce job queue for large workloads.

### Status updates

Add:

```
processing
queued
timeout
```

### Request metadata

Store additional metadata:

```
model
resolution
seed
style
```

---

# License

Internal use for Wix SaaS applications.

Modify and extend according to your platform architecture.

---

# Summary

The **Parametric Image Export Service** is a Wix backend module that:

* securely retrieves secrets
* sends prompts to an external automation pipeline
* monitors webhook health
* manages database status updates

It serves as the **core orchestration layer between a Wix SaaS frontend and an automated image generation backend.**