# HTTP
````md
# Image Receiver HTTP Function for Velo by Wix

A backend HTTP function for a Velo Wix SaaS site that accepts a Base64-encoded image, uploads it to the Wix Media Manager, and updates a `UserImages` collection record with the uploaded image URL and processing status.

This service is useful when an external system, automation pipeline, AI image service, or rendering engine needs to send a finished image back into a Wix site and mark the original request as complete.

---

## Overview

This backend endpoint:

1. Receives a `POST` request containing:
   - `requestId`
   - `imageBase64`
   - optional `mimeType`
2. Converts the Base64 string into a binary blob
3. Uploads the image to Wix Media
4. Looks up the matching record in the `UserImages` collection
5. Updates the record with:
   - `status: "completed"`
   - `imageUrl: <uploaded file url>`
6. If anything fails, it attempts to mark the record as:
   - `status: "failed"`

---

## Use Case

This is designed for workflows where:

- a Wix site creates an image generation request
- an external service processes that request
- the external service sends the completed image back to Wix
- Wix stores the final image and updates the related database record

Typical examples:

- AI image generation
- rendered marketing graphics
- personalized customer image creation
- post-processing pipelines
- webhook-based media ingestion

---

## File Location

Place this code inside your Velo backend HTTP functions file:

```js
backend/http-functions.js
````

Or in a routed backend HTTP functions setup depending on your project structure.

---

## Source Code

```js
import { ok, badRequest } from 'wix-http-functions';
import wixData from 'wix-data';
import wixMedia from 'wix-media-backend';

export async function post_receiveImage(request) {
    let body;
    try {
        body = await request.body.json();
        const { requestId, imageBase64, mimeType = 'image/png' } = body;

        if (!requestId || !imageBase64) {
            return badRequest({ body: "Missing requestId or imageBase64" });
        }

        // Convert base64 to blob
        const buffer = Buffer.from(imageBase64, 'base64');
        const blob = new Blob([buffer], { type: mimeType });

        // @ts-ignore - upload exists at runtime despite incomplete type definitions
        const uploadedFile = await wixMedia.upload(blob, {
            fileName: `user-images/${requestId}.png`,
            mimeType: mimeType
        });

        const imageUrl = uploadedFile.fileUrl;   // public URL

        // 1. Fetch the existing record
        const existingItem = await wixData.get("UserImages", requestId);
        if (!existingItem) {
            return badRequest({ body: "Record not found" });
        }

        // 2. Merge new data (preserves existing fields)
        const updatedItem = {
            ...existingItem,
            status: "completed",
            imageUrl: imageUrl
        };

        // 3. Update with the complete item object (second argument)
        await wixData.update("UserImages", updatedItem);

        return ok({ body: "Image received and saved" });
    } catch (error) {
        // If error, try to mark record as failed (if we have the ID)
        if (body?.requestId) {
            try {
                // Fetch existing item first
                const existingItem = await wixData.get("UserImages", body.requestId);
                if (existingItem) {
                    const failedItem = {
                        ...existingItem,
                        status: "failed"
                    };
                    await wixData.update("UserImages", failedItem);
                }
            } catch (updateError) {
                console.error('Failed to update record to failed:', updateError);
            }
        }
        return badRequest({ body: error.message });
    }
}
```

---

## Endpoint

Because this is a Velo HTTP function named:

```js
post_receiveImage
```

the endpoint will be exposed as:

```text
POST /_functions/receiveImage
```

Example full site URL:

```text
https://yourdomain.com/_functions/receiveImage
```

If testing on a Wix preview or development environment, use the appropriate preview domain.

---

## Request Format

### Method

```http
POST
```

### Content-Type

```http
Content-Type: application/json
```

### Request Body

```json
{
  "requestId": "abc123",
  "imageBase64": "iVBORw0KGgoAAAANSUhEUgAA...",
  "mimeType": "image/png"
}
```

---

## Request Fields

### `requestId`

* **Type:** `string`
* **Required:** yes
* **Description:** The `_id` of the corresponding record in the `UserImages` collection.

### `imageBase64`

* **Type:** `string`
* **Required:** yes
* **Description:** The Base64-encoded image data without the data URL prefix.

Example of what to send:

```text
iVBORw0KGgoAAAANSUhEUgAA...
```

Not this:

```text
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...
```

If your sender includes the prefix, strip it before sending.

### `mimeType`

* **Type:** `string`
* **Required:** no
* **Default:** `image/png`
* **Description:** MIME type of the uploaded image.

Examples:

* `image/png`
* `image/jpeg`
* `image/webp`

---

## Successful Response

When the image is uploaded and the related record is updated successfully:

**HTTP Status:**

```http
200 OK
```

**Response Body:**

```text
Image received and saved
```

---

## Error Responses

### Missing required fields

**HTTP Status:**

```http
400 Bad Request
```

**Response Body:**

```text
Missing requestId or imageBase64
```

### Record not found

**HTTP Status:**

```http
400 Bad Request
```

**Response Body:**

```text
Record not found
```

### Upload or processing failure

**HTTP Status:**

```http
400 Bad Request
```

**Response Body:**

```text
<error message>
```

If an error occurs and `requestId` is available, the function attempts to update the related record to:

```json
{
  "status": "failed"
}
```

---

## Database Requirements

This function expects a Wix Data collection named:

```text
UserImages
```

### Required collection behavior

The collection should contain records whose `_id` matches the incoming `requestId`.

### Suggested fields

| Field Name  | Type             | Purpose                                                             |
| ----------- | ---------------- | ------------------------------------------------------------------- |
| `_id`       | Text / System ID | Unique identifier used as `requestId`                               |
| `status`    | Text             | Tracks processing state such as `pending`, `completed`, or `failed` |
| `imageUrl`  | URL / Text       | Stores the public URL of the uploaded image                         |
| `createdAt` | Date/Time        | Optional audit field                                                |
| `updatedAt` | Date/Time        | Optional audit field                                                |
| `userId`    | Text / Reference | Optional link to the member or customer                             |
| `prompt`    | Text             | Optional metadata for the original request                          |
| `mimeType`  | Text             | Optional original media type                                        |

### Expected lifecycle

A typical record may move through these states:

1. `pending`
2. `completed`
3. `failed`

Example initial record:

```json
{
  "_id": "abc123",
  "status": "pending",
  "imageUrl": ""
}
```

After successful callback:

```json
{
  "_id": "abc123",
  "status": "completed",
  "imageUrl": "https://static.wixstatic.com/media/..."
}
```

---

## How It Works

### 1. Parse incoming JSON

The function reads the request body and extracts:

* `requestId`
* `imageBase64`
* `mimeType`

### 2. Validate required values

If either `requestId` or `imageBase64` is missing, the function returns a bad request response.

### 3. Convert Base64 to binary

The Base64 payload is converted into a buffer and then wrapped into a `Blob`.

### 4. Upload to Wix Media

The blob is uploaded to Wix Media using:

```js
wixMedia.upload(...)
```

The file is stored under:

```text
user-images/{requestId}.png
```

### 5. Fetch existing record

The function retrieves the existing `UserImages` record using the provided `requestId`.

### 6. Update the database

If found, the record is merged and updated with:

* `status: "completed"`
* `imageUrl: uploadedFile.fileUrl`

### 7. Fail gracefully on errors

If something breaks during processing, the function tries to mark the record as failed.

---

## Example Client Request

### JavaScript `fetch`

```js
async function sendImageToWix() {
  const response = await fetch('https://yourdomain.com/_functions/receiveImage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requestId: 'abc123',
      imageBase64: 'iVBORw0KGgoAAAANSUhEUgAA...',
      mimeType: 'image/png'
    })
  });

  const text = await response.text();
  console.log(response.status, text);
}
```

---

## Example With Base64 Prefix Removal

If your source image string looks like this:

```text
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...
```

strip the prefix before sending:

```js
const rawBase64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
```

Then send:

```js
{
  requestId: 'abc123',
  imageBase64: rawBase64,
  mimeType: 'image/png'
}
```

---

## Suggested Upstream Workflow

A common Wix SaaS pattern looks like this:

### Step 1: Create request record in Wix

Your site creates a `UserImages` record:

```json
{
  "_id": "abc123",
  "status": "pending"
}
```

### Step 2: Send job to external service

An external service or automation receives the request and generates the image.

### Step 3: External service calls this endpoint

After generation, the external service sends the completed image back to:

```text
POST /_functions/receiveImage
```

### Step 4: Wix updates the record

The record is marked as completed and stores the public image URL.

### Step 5: Frontend displays result

Your Wix frontend reads the updated collection item and shows the finished image to the user.

---

## Frontend Consumption Example

Example of checking a record from the frontend:

```js
import wixData from 'wix-data';

async function loadImageStatus(requestId) {
  const item = await wixData.get('UserImages', requestId);

  if (item.status === 'completed') {
    console.log('Image ready:', item.imageUrl);
  } else if (item.status === 'failed') {
    console.log('Image generation failed');
  } else {
    console.log('Still processing');
  }
}
```

---

## Security Considerations

This endpoint accepts public HTTP requests unless protected by additional controls. For a production SaaS implementation, add authentication and verification.

### Recommended protections

#### 1. Shared secret or API key

Require a secret header such as:

```http
x-api-key: your-secret-key
```

Then validate it before processing.

#### 2. Signature validation

For third-party callback services, verify a signed webhook payload.

#### 3. Request size limits

Base64 images can be large. Enforce reasonable payload size limits upstream.

#### 4. MIME type validation

Restrict uploads to allowed image types such as:

* `image/png`
* `image/jpeg`
* `image/webp`

#### 5. Rate limiting

Protect the endpoint from abuse or accidental retries.

#### 6. Collection permissions

Make sure the `UserImages` collection permissions are configured properly in Wix.

---

## Production Recommendations

### Store the correct file extension

Right now, the upload file name is always:

```js
user-images/${requestId}.png
```

If `mimeType` is not PNG, the file extension may not match the actual image type.

A better approach is to map the extension from the MIME type.

Example:

```js
const extensionMap = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp'
};

const extension = extensionMap[mimeType] || 'png';
const fileName = `user-images/${requestId}.${extension}`;
```

### Validate supported MIME types

Example:

```js
const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];

if (!allowedMimeTypes.includes(mimeType)) {
  return badRequest({ body: 'Unsupported mimeType' });
}
```

### Add logging

For easier debugging, log:

* request start
* upload success
* database update success
* failure reason

### Store more metadata

Consider updating the item with:

* `mimeType`
* `processedAt`
* `source`
* `fileName`

### Prevent duplicate processing

If a record is already `completed`, decide whether retries should be ignored or overwrite the existing image.

---

## Known Notes About the Current Implementation

### 1. `wixMedia.upload` type definitions may be incomplete

The code includes:

```js
// @ts-ignore - upload exists at runtime despite incomplete type definitions
```

This means the function is available at runtime, but TypeScript definitions may not fully reflect it.

### 2. Uses `Buffer` and `Blob`

This implementation assumes those objects are available in the Velo backend runtime. If your environment behaves differently, you may need an alternate binary conversion approach.

### 3. `wixData.get()` behavior

In most Wix cases, `wixData.get(collectionId, itemId)` throws when a record does not exist rather than returning `null`. The explicit `if (!existingItem)` check is still harmless as a defensive check.

### 4. Error body exposes raw error messages

Returning `error.message` is convenient for debugging, but in production you may want to return a generic message and log the internal error separately.

---

## Improved Version Example

Here is a safer production-oriented version with MIME validation and extension mapping:

```js
import { ok, badRequest } from 'wix-http-functions';
import wixData from 'wix-data';
import wixMedia from 'wix-media-backend';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const EXTENSION_MAP = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp'
};

export async function post_receiveImage(request) {
  let body;

  try {
    body = await request.body.json();
    const { requestId, imageBase64, mimeType = 'image/png' } = body;

    if (!requestId || !imageBase64) {
      return badRequest({ body: 'Missing requestId or imageBase64' });
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return badRequest({ body: 'Unsupported mimeType' });
    }

    const extension = EXTENSION_MAP[mimeType] || 'png';
    const buffer = Buffer.from(imageBase64, 'base64');
    const blob = new Blob([buffer], { type: mimeType });

    // @ts-ignore
    const uploadedFile = await wixMedia.upload(blob, {
      fileName: `user-images/${requestId}.${extension}`,
      mimeType
    });

    const existingItem = await wixData.get('UserImages', requestId);

    const updatedItem = {
      ...existingItem,
      status: 'completed',
      imageUrl: uploadedFile.fileUrl,
      mimeType
    };

    await wixData.update('UserImages', updatedItem);

    return ok({ body: 'Image received and saved' });
  } catch (error) {
    if (body?.requestId) {
      try {
        const existingItem = await wixData.get('UserImages', body.requestId);
        await wixData.update('UserImages', {
          ...existingItem,
          status: 'failed'
        });
      } catch (updateError) {
        console.error('Failed to update record to failed:', updateError);
      }
    }

    console.error('receiveImage error:', error);
    return badRequest({ body: 'Image processing failed' });
  }
}
```

---

## Testing Checklist

Before deploying, confirm the following:

* `UserImages` collection exists
* record is created before callback is sent
* `_id` of the record matches `requestId`
* HTTP function is published
* external service sends raw Base64 without data URL prefix
* MIME type is valid
* media upload permissions work correctly
* returned `imageUrl` is accessible
* frontend properly responds to `pending`, `completed`, and `failed`

---

## Sample Test Payload

Use this for Postman or webhook testing:

```json
{
  "requestId": "test-request-001",
  "imageBase64": "iVBORw0KGgoAAAANSUhEUgAAAAUA...",
  "mimeType": "image/png"
}
```

---

## Postman Setup

### URL

```text
https://yourdomain.com/_functions/receiveImage
```

### Method

```text
POST
```

### Headers

```text
Content-Type: application/json
```

### Body

```json
{
  "requestId": "test-request-001",
  "imageBase64": "iVBORw0KGgoAAAANSUhEUgAAAAUA...",
  "mimeType": "image/png"
}
```

---

## Troubleshooting

### Problem: “Missing requestId or imageBase64”

Cause:

* request body is missing one or both required fields

Fix:

* confirm JSON payload is valid
* confirm field names match exactly

### Problem: “Record not found”

Cause:

* no `UserImages` record exists with `_id === requestId`

Fix:

* create the record before calling the endpoint
* verify the exact ID being sent

### Problem: Upload fails

Cause:

* invalid Base64
* unsupported MIME type
* Wix media upload issue

Fix:

* verify the Base64 string is clean
* verify the image content is valid
* test with a small PNG first

### Problem: Record updates to `failed`

Cause:

* any error during parsing, upload, fetch, or update

Fix:

* check backend logs
* verify collection name and item ID
* confirm media upload behavior in your environment

---

## Best Fit For SaaS Systems

This service is a strong fit for Wix SaaS products that need:

* asynchronous image generation
* callback-based asset delivery
* customer-specific visual output
* centralized storage of generated media
* simple status tracking in a Wix collection

---

## License

Use and adapt this code according to your project’s internal standards and Wix site requirements.

---

## Summary

This Velo backend HTTP function provides a clean callback endpoint for receiving generated images, uploading them into Wix Media, and updating the corresponding database record in `UserImages`.

It is ideal for SaaS workflows where image creation happens outside of Wix but final storage, status tracking, and presentation happen inside the Wix platform.

```

I can also turn this into a polished downloadable `README.md` file.
```
