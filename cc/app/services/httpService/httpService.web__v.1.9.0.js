/**
 * 'PARAMETRIC' IMAGE GENERATOR v.2 (adbyrd.com/cc)
 * [ BACKEND SERVICE ] 'HTTP'
 * version 1.9.0
 */

import { ok, badRequest } from 'wix-http-functions';
import wixData from 'wix-data';
import { mediaManager } from 'wix-media-backend';

function normalizeBase64(base64String) {
    if (!base64String || typeof base64String !== 'string') {
        return '';
    }

    // Supports both raw base64 and data URLs like: data:image/png;base64,AAAA...
    return base64String.includes(',')
        ? base64String.split(',')[1]
        : base64String;
}

function getFileExtension(mimeType = 'image/png') {
    const map = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/webp': 'webp',
        'image/gif': 'gif'
    };

    return map[mimeType] || 'png';
}

function getMediaType(mimeType = 'image/png') {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
}

export async function post_receiveImage(request) {
    let body;

    try {
        body = await request.body.json();

        const {
            requestId,
            imageBase64,
            mimeType = 'image/png'
        } = body;

        if (!requestId || !imageBase64) {
            return badRequest({ body: 'Missing requestId or imageBase64' });
        }

        const existingItem = await wixData.get('UserImages', requestId);
        if (!existingItem) {
            return badRequest({ body: 'Record not found' });
        }

        const cleanBase64 = normalizeBase64(imageBase64);
        const buffer = Buffer.from(cleanBase64, 'base64');

        if (!buffer || !buffer.length) {
            return badRequest({ body: 'Invalid imageBase64 payload' });
        }

        const extension = getFileExtension(mimeType);
        const fileName = `${requestId}.${extension}`;

        const uploadedFile = await mediaManager.upload(
            '/user-images',
            buffer,
            fileName,
            {
                mediaOptions: {
                    mimeType,
                    mediaType: getMediaType(mimeType)
                },
                metadataOptions: {
                    isPrivate: false,
                    isVisitorUpload: false
                }
            }
        );

        const imageUrl = uploadedFile?.fileUrl || '';

        const updatedItem = {
            ...existingItem,
            status: 'completed',
            imageUrl
        };

        await wixData.update('UserImages', updatedItem);

        return ok({
            body: JSON.stringify({
                success: true,
                requestId,
                imageUrl,
                message: 'Image received and saved'
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        if (body?.requestId) {
            try {
                const existingItem = await wixData.get('UserImages', body.requestId);
                if (existingItem) {
                    const failedItem = {
                        ...existingItem,
                        status: 'failed'
                    };
                    await wixData.update('UserImages', failedItem);
                }
            } catch (updateError) {
                console.error('Failed to update record to failed:', updateError);
            }
        }

        return badRequest({
            body: error?.message || 'Unknown server error'
        });
    }
}