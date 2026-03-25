/**
 * CONTENT CREATOR MASTER PAGE
 * @version 2.1.0
 * @updated 2026-03-25
 */

import { authentication, currentMember } from 'wix-members-frontend';
import wixLocation from 'wix-location';
import wixUsers from 'wix-users';

// Standardized System Messages
const MSG_GLOBAL_SYSTEM_ERROR = "A system-wide error has occurred. Some features may be unavailable.";

$w.onReady(function () {
    
    authentication.onLogin(async (member) => {
        try {
            console.log('[cc-v2.1.0] User logged in. Redirecting to profile...');
            wixLocation.to('/profile');
        } catch (error) {
            console.error("[cc-v2.1.0] Login redirect error:", error);
            wixLocation.to('/cc');
        }
    });

    bootUI();
});

/**
 * UI INITIALIZATION
 */
function bootUI() {
    console.log('[cc-v2.1.0] Initializing Member Header...');
    
    const globalErrorCell = $w('#ccGlobalHeaderError');
    if (globalErrorCell) {
        globalErrorCell.collapse();
        globalErrorCell.hide();
    }

    wireInternalNavHandlers();
}

function wireInternalNavHandlers() {
    $w('#ccLogoutButton').onClick(async () => {
        await handleLogout();
    });
}

/**
 * GLOBAL ERROR MANAGEMENT
 * Handles serious, persistent errors within the #ccMemberHeader hierarchy.
 */
async function showGlobalError(message = MSG_GLOBAL_SYSTEM_ERROR) {
    const errorCell = $w('#ccGlobalHeaderError');
    const errorMsgEl = $w('#ccGlobalHeaderErrorMsg');

    if (errorCell && errorMsgEl) {
        console.error(`[cc-v2.1.0] Global Error Triggered: ${message}`);
        
        errorMsgEl.text = message;
        
        await errorCell.expand(); 
        await errorCell.show("fade", { duration: 400 });
    }
}

/**
 * LOGOUT LOGIC
 */
async function handleLogout() {
    const logoutRedirectUrl = 'https://www.adbyrd.com/cc';
    
    try {
        console.log('[cc-v2.1.0] User initiated logout.');
        await wixUsers.logout();
        wixLocation.to(logoutRedirectUrl);
    } catch (err) {
        console.error('[cc-v2.1.0] Logout failed:', err);
        showGlobalError('An error occurred while logging out. Please try again.');
    }
}