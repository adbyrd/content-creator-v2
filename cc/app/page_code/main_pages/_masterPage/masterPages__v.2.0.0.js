/**
 * CONTENT CREATOR MASTER PAGE
 * version: 2.0.0
 */

import { authentication } from 'wix-members-frontend';
import wixLocation from 'wix-location';
import { currentMember } from 'wix-members-frontend';
import wixUsers from 'wix-users';

$w.onReady(function () {
    
    authentication.onLogin(async (member) => {
        try {
            const roles = await currentMember.getRoles();
            const isAdmin = roles.some(role => role.name === 'Admin');

            if (isAdmin) {
                wixLocation.to('/profile');
            } else {
                wixLocation.to('/profile');
            }
        } catch (error) {
            console.error("Login redirect error:", error);
            wixLocation.to('/cc');
        }
    });

    bootUI();

});

function bootUI() {
    console.log('[cc-v1.0.0] Initializing Member Header...');
    wireInternalNavHandlers();
}

function wireInternalNavHandlers() {
    $w('#ccLogoutButton').onClick(async () => {
        await handleLogout();
    });
}

async function handleLogout() {
    const logoutRedirectUrl = 'https://www.adbyrd.com/cc';
    
    try {
        console.log('[cc-v1.0.0] User initiated logout.');

        await wixUsers.logout();
        
        console.log(`[cc-v1.0.0] Logout successful. Redirecting to: ${logoutRedirectUrl}`);
        
        wixLocation.to(logoutRedirectUrl);

    } catch (err) {
        console.error('[cc-v1.0.0] Logout failed:', err);
        
        showError('An error occurred while logging out. Please try again.');
    }
}

function showError(message) {
    const errorEl = $w('#ccGlobalError');
    if (errorEl) {
        errorEl.text = message;
        errorEl.expand();
    }
}