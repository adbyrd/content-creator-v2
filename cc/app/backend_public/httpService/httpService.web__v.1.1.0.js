/**
 * 'PARAMETRIC' IMAGE GENERATOR v.2 (adbyrd.com/cc)
 * [ BACKEND SERVICE ] 'HTTP'
 * version 1.1.0
 */

import { ok, badRequest } from 'wix-http-functions';
import wixData from 'wix-data';
import { upload } from 'wix-media-backend';

export async function post_receiveImage(request) {
    try {
        const body = await request.body.json();
        const { requestId, imageBase64, mimeType = 'image/png' } = body;

        if (!requestId || !imageBase64) {
            return badRequest({ message: "Missing requestId or imageBase64" });
        }

        // Convert base64 to blob and upload to Wix Media
        const buffer = Buffer.from(imageBase64, 'base64');
        const blob = new Blob([buffer], { type: mimeType });
        const uploadedFile = await upload(blob, {
            fileName: `user-images/${requestId}.png`,
            mimeType: mimeType
        });

        const imageUrl = uploadedFile.fileUrl;  // public URL

        // Update the database record
        await wixData.update("UserImages", requestId, {
            status: "completed",
            imageUrl: imageUrl
        });

        return ok({ message: "Image received and saved" });
    } catch (error) {
        // If error, mark record as failed (if we have the ID)
        if (body?.requestId) {
            await wixData.update("UserImages", body.requestId, { status: "failed" });
        }
        return badRequest({ message: error.message });
    }
}