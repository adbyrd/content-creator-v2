/**
 * 'PARAMETRIC' IMAGE GENERATOR v.2 (adbyrd.com/cc)
 * [ BACKEND SERVICE ] 'HTTP'
 * 
 * USE FOR TESTING PURPOSES ONLY - NOT PRODUCTION READY
 * version 0.0.3
 */


import { ok, badRequest } from 'wix-http-functions';
import wixData from 'wix-data';
// import wixMedia from 'wix-media-backend';   // temporarily commented

export async function post_receiveImage(request) {
    let body;
    try {
        body = await request.body.json();
        const { requestId, imageBase64, mimeType = 'image/png' } = body;

        if (!requestId || !imageBase64) {
            return badRequest({ body: "Missing requestId or imageBase64" });
        }

        // Simulate success without uploading
        const imageUrl = "https://example.com/fake.jpg";

        const existingItem = await wixData.get("UserImages", requestId);
        if (!existingItem) {
            return badRequest({ body: "Record not found" });
        }

        const updatedItem = {
            ...existingItem,
            status: "completed",
            imageUrl: imageUrl
        };

        await wixData.update("UserImages", updatedItem);
        return ok({ body: "Image received and saved (simulated)" });
    } catch (error) {
        if (body?.requestId) {
            try {
                const existingItem = await wixData.get("UserImages", body.requestId);
                if (existingItem) {
                    const failedItem = { ...existingItem, status: "failed" };
                    await wixData.update("UserImages", failedItem);
                }
            } catch (updateError) {
                console.error('Failed to update record to failed:', updateError);
            }
        }
        return badRequest({ body: error.message });
    }
}