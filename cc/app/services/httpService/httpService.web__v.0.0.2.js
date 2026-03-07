/**
 * 'PARAMETRIC' IMAGE GENERATOR v.2 (adbyrd.com/cc)
 * [ BACKEND SERVICE ] 'HTTP'
 * 
 * USE FOR TESTING PURPOSES ONLY - NOT PRODUCTION READY
 * version 0.0.2
 */


import { ok, badRequest } from 'wix-http-functions';
import wixData from 'wix-data';
import wixMedia from 'wix-media-backend';

export async function post_receiveImage(request) {
        let body;
    try {
        body = await request.body.json();
        const { requestId, imageBase64, mimeType = 'image/png' } = body;


        
        return ok({ body: "PARAMETRIC - Function works!" });
    } catch (error) {
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
        return badRequest({ body: "PARAMETRIC - Function error: " + error });
    }
    
}