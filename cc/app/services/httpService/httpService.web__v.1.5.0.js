/**
 * 'PARAMETRIC' IMAGE GENERATOR v.2 (adbyrd.com/cc)
 * [ BACKEND SERVICE ] 'HTTP'
 * version 1.5.0
 */

// backend/http-functions.js
import { ok, badRequest } from 'wix-http-functions';
import wixData from 'wix-data';
import wixMedia from 'wix-media-backend';   // Correct default import

export async function post_receiveImage(request) {
    let body;
    try {
        body = await request.body.json();
        const { requestId, imageBase64, mimeType = 'image/png' } = body;

        if (!requestId || !imageBase64) {
            return badRequest({ body: "Missing requestId or imageBase64" });
        }

        // Convert base64 to blob and upload to Wix Media
        const buffer = Buffer.from(imageBase64, 'base64');
        const blob = new Blob([buffer], { type: mimeType });

        // @ts-ignore - The type definition for wix-media-backend is incomplete; upload exists at runtime.
        const uploadedFile = await wixMedia.upload(blob, {
            fileName: `user-images/${requestId}.png`,
            mimeType: mimeType
        });

        const imageUrl = uploadedFile.fileUrl;   // public URL

        // @ts-ignore - The 'status' field is part of the item object, not options. This warning is harmless.
        await wixData.update("UserImages", requestId, {
            status: "completed",
            imageUrl: imageUrl
        });

        return ok({ body: "Image received and saved" });
    } catch (error) {
        if (body?.requestId) {
            try {
                // @ts-ignore - Same harmless warning as above.
                await wixData.update("UserImages", body.requestId, { status: "failed" });
            } catch (updateError) {
                console.error('Failed to update record to failed:', updateError);
            }
        }
        return badRequest({ body: error.message });
    }
}