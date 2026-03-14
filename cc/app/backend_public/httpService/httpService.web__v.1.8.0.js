/**
 * 'PARAMETRIC' IMAGE GENERATOR v.2 (adbyrd.com/cc)
 * [ BACKEND SERVICE ] 'HTTP'
 * version 1.8.0
 */


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