/**
 * 'PARAMETRIC' IMAGE GENERATOR v.2 (adbyrd.com/cc)
 * [ BACKEND SERVICE ] 'HTTP'
 * version 1.7.0
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

        // @ts-ignore - status is a field in the collection, not an option (false positive)
        await wixData.update("UserImages", requestId, {
            status: "completed",
            imageUrl: imageUrl
        });

        return ok({ body: "Image received and saved" });
    } catch (error) {
        if (body?.requestId) {
            try {
                // @ts-ignore - same harmless warning
                await wixData.update("UserImages", body.requestId, { status: "failed" });
            } catch (updateError) {
                console.error('Failed to update record to failed:', updateError);
            }
        }
        return badRequest({ body: error.message });
    }
}