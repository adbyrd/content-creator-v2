/**
 * 'PARAMETRIC' IMAGE GENERATOR v.2 (adbyrd.com/cc)
 * [ BACKEND SERVICE ] 'EXPORT' & 'STATUS CHECK'
 * version 2.1.0
 */

import { fetch } from 'wix-fetch';
import { getSecret } from 'wix-secrets-backend';
import { webMethod, Permissions } from 'wix-web-module';
import wixData from 'wix-data';   // added for status updates

console.log('[parametricService] Module loaded – version 2.1.0');

/**
 * Retrieve secrets required for webhook and authentication.
 * @returns {Promise<Object>} Object containing webhookUrl, clientId, clientSecret, projectId.
 */
async function getSecrets() {
    try {
        const webhookUrl = await getSecret('CC_EXPORT_IMAGE');
        const clientId = await getSecret('CLIENT_ID');
        const clientSecret = await getSecret('CLIENT_SECRET');
        const projectId = await getSecret('PROJECT_ID');

        console.log('[parametricService] Secrets retrieved:', {
            webhookUrl: webhookUrl ? 'present' : 'missing',
            clientId: clientId ? 'present' : 'missing',
            clientSecret: clientSecret ? 'present' : 'missing',
            projectId: projectId ? 'present' : 'missing'
        });

        return { webhookUrl, clientId, clientSecret, projectId };
    } catch (error) {
        console.error('[parametricService] Secret retrieval failed:', error.message);
        throw new Error(`Secret retrieval failed: ${error.message}`);
    }
}

/**
 * Main image generation function.
 * Called from the frontend with an object containing prompt and requestId.
 * Sends the data to the n8n webhook and updates the database record on failure.
 *
 * @param {Object} params
 * @param {string} params.prompt - The user's image prompt.
 * @param {string} params.requestId - The _id of the pending record in UserImages.
 * @returns {Promise<Object>} Result object indicating success.
 */
export const exportImage = webMethod(Permissions.Anyone, async ({ prompt, requestId }) => {
    console.log('[cc-v1.0.0] - Backend: exportImage called with', { prompt, requestId });
    try {
        const { webhookUrl } = await getSecrets();

        // Simplified payload: only what n8n needs
        const payload = { prompt, requestId };

        const response = await fetch(webhookUrl, {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log(`[cc-v1.0.0] - Backend: Webhook response status ${response.status}`);

        if (response.ok) {
            const responseText = await response.text();
            console.log('[cc-v1.0.0] - Backend: Webhook succeeded');
            return { success: true, status: response.status, body: responseText };
        } else {
            const errorText = await response.text();
            console.error('[cc-v1.0.0] - Backend: Webhook error', response.status, errorText);

            // Mark the database record as failed
            try {
                await wixData.update('UserImages', requestId, { status: 'failed' });
                console.log('[cc-v1.0.0] - Record marked as failed:', requestId);
            } catch (updateError) {
                console.error('[cc-v1.0.0] - Failed to update record to failed:', updateError);
            }

            throw new Error(`Webhook responded with ${response.status}: ${errorText}`);
        }
    } catch (error) {
        console.error('[cc-v1.0.0] - Backend: Exception in exportImage', error);

        // Attempt to mark record as failed if we have requestId
        if (requestId) {
            try {
                await wixData.update('UserImages', requestId, { status: 'failed' });
                console.log('[cc-v1.0.0] - Record marked as failed due to exception:', requestId);
            } catch (updateError) {
                console.error('[cc-v1.0.0] - Failed to update record to failed:', updateError);
            }
        }

        throw error; // rethrow so frontend knows
    }
});

/**
 * Check webhook connectivity and secret configuration.
 * @returns {Promise<Object>} Status object.
 */
export const checkWebhookStatus = webMethod(Permissions.Anyone, async () => {
    console.log('[cc-v1.0.0] - Backend: checkWebhookStatus called');
    const status = {
        configured: false,
        details: null,
        error: null,
        lastCheck: new Date().toISOString(),
        ready: false,
        testPassed: false
    };

    try {
        const { webhookUrl, clientId, clientSecret, projectId } = await getSecrets();

        status.configured = true;
        status.details = {
            webhookUrl: webhookUrl ? 'present' : 'missing',
            clientId: clientId ? 'present' : 'missing',
            clientSecret: clientSecret ? 'present' : 'missing',
            projectId: projectId ? 'present' : 'missing'
        };

        // Only test if webhookUrl exists
        if (webhookUrl) {
            const testPayload = [{ test: true, action: 'status_check' }];
            const response = await fetch(webhookUrl, {
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testPayload)
            });

            if (response.ok) {
                status.ready = true;
                status.testPassed = true;
            } else {
                status.error = `Webhook responded with status ${response.status}`;
                const errorText = await response.text();
                status.details = { ...status.details, responseError: errorText.substring(0, 200) };
            }
        } else {
            status.error = 'Webhook URL secret missing';
        }
    } catch (error) {
        status.error = error.message;
    }

    console.log('[cc-v1.0.0] - Backend: checkWebhookStatus result', status);
    return status;
});