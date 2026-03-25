/**
 * MEMBER CHECK
 * @version 1.1.0
 * @updated 2026-03-24
 */

import wixLocation from 'wix-location';
import { checkMemberExists } from 'backend/memberFunctions.web';

const VERSION = '[cc-v1.1.0]';
const MSG_ERROR_GENERIC = 'Something went wrong. Please try again or contact support.';

$w.onReady(function () {
    bootUI();
    wireEventHandlers();
});

/**
 * Initial UI state setup
 */
function bootUI() {
    safeCollapse("#ccPreCheck");
}

/**
 * Sets up event listeners
 */
function wireEventHandlers() {
    $w("#ccMemberCheck").onClick(async () => {
        await handleMemberCheck();
    });
}

/**
 * Core logic for member verification
 */
async function handleMemberCheck() {
    const email = $w("#ccMemberEmail").value;

    // Validation
    if (!email || !$w("#ccMemberEmail").valid) {
        $w("#ccMemberEmail").updateValidityIndication();
        return;
    }

    // UI Feedback: Show preloader and disable button
    safeExpand("#ccPreCheck");
    safeDisable("#ccMemberCheck", true);

    try {
        console.log(`${VERSION} Initiating member check...`);
        const response = await checkMemberExists(email);

        if (response.ok) {
            if (response.exists) {
                wixLocation.to("/profile");
            } else {
                wixLocation.to("/pricing-plans");
            }
        } else {
            // Structured error handling
            throw new Error(response.error?.message || 'Server Error');
        }
    } catch (err) {
        console.error(`${VERSION} Flow Error:`, err);
        showUserError(MSG_ERROR_GENERIC); 
        
        // Defensive fallback: Send to pricing if check fails 
        wixLocation.to("/pricing-plans");
    }
}

/**
 * SAFE UI HELPERS 
 */
function safeDisable(selector, disabled = true) {
    const el = $w(selector);
    if (el) el.disable();
}

function safeExpand(selector) {
    const el = $w(selector);
    if (el) el.expand();
}

function safeCollapse(selector) {
    const el = $w(selector);
    if (el) el.collapse();
}

function showUserError(message) {
    // Implementation of central error logic
    console.warn(`${VERSION} User Error Displayed: ${message}`);
}