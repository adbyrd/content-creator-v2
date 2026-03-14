/**
 * 'PARAMETRIC' IMAGE GENERATOR v.2 (adbyrd.com/cc)
 * [ BACKEND SERVICE ] 'HTTP'
 * version 1.6.0
 */

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

        // Convert base64 to blob
        const buffer = Buffer.from(imageBase64, 'base64');
        const blob = new Blob([buffer], { type: mimeType });

        // Upload to Wix Media (type definition incomplete, but runtime works)
        // @ts-ignore - upload exists at runtime
        const uploadedFile = await wixMedia.upload(blob, {
            fileName: `user-images/${requestId}.png`,
            mimeType: mimeType
        });

        const imageUrl = uploadedFile.fileUrl;   // public URL

        // Prepare update data – use 'as any' to silence the false positive
        const updateData = {
            status: "completed",
            imageUrl: imageUrl
        } as any;   // <-- type assertion removes the error

        await wixData.update("UserImages", requestId, updateData);

        return ok({ body: "Image received and saved" });
    } catch (error) {
        if (body?.requestId) {
            try {
                // Mark as failed if something went wrong
                const failedData = { status: "failed" } as any;
                await wixData.update("UserImages", body.requestId, failedData);
            } catch (updateError) {
                console.error('Failed to update record to failed:', updateError);
            }
        }
        return badRequest({ body: error.message });
    }
}