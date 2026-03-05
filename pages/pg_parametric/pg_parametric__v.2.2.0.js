/**
 * 'PARAMETRIC' IMAGE GENERATOR v.2 (adbyrd.com/cc)
 * [ PAGE ] 'PARAMETRIC' IMAGE GENERATOR (adbyrd.com/cc/image-generator)
 * version 2.2.0
 */

import { testBackendServices } from 'backend/backendLoadTest.web';
import { exportImage, checkWebhookStatus } from 'backend/parametricServicev2.web';
import wixData from 'wix-data';
import wixUsers from 'wix-users';

let currentRequestId = null;
let pollInterval = null;

$w.onReady(async function () {
    // Optional backend test
    try {
        const status = await testBackendServices();
        console.log("[Page] Backend test result:", status);
    } catch (err) {
        console.error("[Page] Backend test failed:", err);
    }

    // Verify backend functions are loaded
    if (typeof checkWebhookStatus !== 'function' || typeof exportImage !== 'function') {
        console.error("Backend functions not available – check that backend file is saved and published.");
        return;
    }

    // 1. Check webhook status on load
    checkWebhookStatus()
        .then(status => console.log("Webhook status:", status))
        .catch(err => console.error("Webhook status check failed:", err));

    // 2. Handle export button click
    const exportButton = $w('#ccFileExportImage');
    if (exportButton) {
        exportButton.onClick(async () => {
            const user = wixUsers.currentUser;
            if (!user.loggedIn) {
                console.error("User not logged in");
                // Show a message or redirect to login
                return;
            }
            const memberId = user.id;

            const promptInput = $w('#promptInput');
            if (!promptInput) {
                console.error("Prompt input not found on page");
                return;
            }
            const prompt = promptInput.value;
            if (!prompt) {
                console.error("Prompt is empty");
                return;
            }

            // Create pending record
            try {
                const newItem = {
                    memberId,
                    prompt,
                    status: 'pending',
                    createdAt: new Date()
                };
                const inserted = await wixData.insert('UserImages', newItem);
                currentRequestId = inserted._id;
                console.log("Pending record created:", currentRequestId);

                // Show loading indicator, hide previous image
                $w('#loadingIndicator').show();
                $w('#imageDisplay').hide();

                // Trigger n8n generation
                await exportImage({ prompt, requestId: currentRequestId });
                console.log("exportImage called successfully");

                // Start polling for completion
                startPolling(currentRequestId);
            } catch (error) {
                console.error("Error in image generation flow:", error);
                $w('#loadingIndicator').hide();
                // Optionally show user-friendly error message
            }
        });
    } else {
        console.warn("Export button #ccFileExportImage not found on page.");
    }
});

function startPolling(requestId) {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(async () => {
        try {
            const item = await wixData.get('UserImages', requestId);
            if (item.status === 'completed') {
                clearInterval(pollInterval);
                pollInterval = null;
                $w('#loadingIndicator').hide();
                $w('#imageDisplay').src = item.imageUrl;
                $w('#imageDisplay').show();
            } else if (item.status === 'failed') {
                clearInterval(pollInterval);
                pollInterval = null;
                $w('#loadingIndicator').hide();
                console.error("Image generation failed");
                // Show error message to user
            }
        } catch (err) {
            console.error("Polling error:", err);
        }
    }, 2000); // poll every 2 seconds
}