/**
 * 'PARAMETRIC' IMAGE GENERATOR v.2 (adbyrd.com/cc)
 * [ BACKEND SERVICE ] 'HTTP'
 * version 1.2.0
 */

import { ok, badRequest } from 'wix-http-functions';
import wixData from 'wix-data';
import * as wixMediaBackend from 'wix-media-backend';  // use namespace import to avoid missing export error

export async function post_receiveImage(request) {
    let body;  // declare body here so it's accessible in catch block
    try {
        body = await request.body.json();
        const { requestId, imageBase64, mimeType = 'image/png' } = body;

        if (!requestId || !imageBase64) {
            return badRequest("Missing requestId or imageBase64");  // plain string response
        }

        // Convert base64 to blob and upload to Wix Media
        const buffer = Buffer.from(imageBase64, 'base64');
        const blob = new Blob([buffer], { type: mimeType });
        const uploadedFile = await wixMediaBackend.upload(blob, {
            fileName: `user-images/${requestId}.png`,
            mimeType: mimeType
        });

        const imageUrl = uploadedFile.fileUrl;  // public URL

        // Update the database record
        await wixData.update("UserImages", requestId, {
            status: "completed",
            imageUrl: imageUrl
        });

        return ok("Image received and saved");  // plain string response
    } catch (error) {
        // If error, mark record as failed (if we have the ID)
        if (body?.requestId) {
            try {
                await wixData.update("UserImages", body.requestId, { status: "failed" });
            } catch (updateError) {
                console.error('Failed to update record to failed:', updateError);
            }
        }
        return badRequest(error.message);  // plain string response
    }
}