/**
 * 'PARAMETRIC' IMAGE GENERATOR v.2 (adbyrd.com/cc)
 * [ BACKEND SERVICE ] 'HTTP'
 * version 1.3.0
 */

import { ok, badRequest } from 'wix-http-functions';
import wixData from 'wix-data';
import { upload } from 'wix-media-backend';   // named import – works when package is installed

export async function post_receiveImage(request) {
    let body;   // declared here so it's accessible in catch block
    try {
        body = await request.body.json();
        const { requestId, imageBase64, mimeType = 'image/png' } = body;

        if (!requestId || !imageBase64) {
            // Return a proper response object with a body property
            return badRequest({ body: "Missing requestId or imageBase64" });
        }

        // Convert base64 to blob and upload to Wix Media
        const buffer = Buffer.from(imageBase64, 'base64');
        const blob = new Blob([buffer], { type: mimeType });
        const uploadedFile = await upload(blob, {
            fileName: `user-images/${requestId}.png`,
            mimeType: mimeType
        });

        const imageUrl = uploadedFile.fileUrl;   // public URL

        // Update the database record
        await wixData.update("UserImages", requestId, {
            status: "completed",
            imageUrl: imageUrl
        });   // the type warning about 'status' is harmless – ignore it

        return ok({ body: "Image received and saved" });
    } catch (error) {
        // If we have a requestId, mark the record as failed
        if (body?.requestId) {
            try {
                await wixData.update("UserImages", body.requestId, { status: "failed" });
            } catch (updateError) {
                console.error('Failed to update record to failed:', updateError);
            }
        }
        return badRequest({ body: error.message });
    }
}