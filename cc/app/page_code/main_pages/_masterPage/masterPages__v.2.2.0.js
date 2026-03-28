/**
 * CONTENT CREATOR MASTER PAGE
 * Global UI Controller for Toasters and Authentication
 * @version 2.2.0
 */

import { authentication } from 'wix-members-frontend';
import wixLocation from 'wix-location';
import wixUsers from 'wix-users';

const VERSION_TAG = '[ccMaster-v2.1.0]';
const MSG_GLOBAL_SYSTEM_ERROR = "A system-wide error has occurred. Some features may be unavailable.";
const TOASTER_DURATION = 5000;
const ANIMATION_SPEED = 300;

$w.onReady(function () {
    console.log(`${VERSION_TAG} Initialization Started`);
    bootUI();
    wireAuthEvents();
});

function bootUI() {
    const successToaster = $w('#ccSuccessToaster');
    const errorToaster = $w('#ccErrorsToaster');
    const globalHeaderError = $w('#ccGlobalHeaderError');

    if (successToaster) successToaster.hide();
    if (errorToaster) errorToaster.hide();
    
    if (globalHeaderError) {
        globalHeaderError.collapse();
        globalHeaderError.hide();
    }

    const logoutBtn = $w('#ccLogoutButton');
    if (logoutBtn) {
        logoutBtn.onClick(() => handleLogout());
    }
}

export function showSuccess(message) {
    const toaster = $w('#ccSuccessToaster');
    const msgEl = $w('#ccSuccessMsg');

    if (toaster && msgEl) {
        msgEl.text = message;
        toaster.show('fade', { duration: ANIMATION_SPEED });
        
        setTimeout(() => {
            if (toaster.isVisible) {
                toaster.hide('fade', { duration: ANIMATION_SPEED });
            }
        }, TOASTER_DURATION);
    } else {
        console.warn(`${VERSION_TAG} Global Success Toaster elements missing from DOM.`);
    }
}

export function showError(message = MSG_GLOBAL_SYSTEM_ERROR) {
    const toaster = $w('#ccErrorsToaster');
    const msgEl = $w('#ccErrorMsg');

    if (toaster && msgEl) {
        msgEl.text = message;
        toaster.show('fade', { duration: ANIMATION_SPEED });
        
        setTimeout(() => {
            if (toaster.isVisible) {
                toaster.hide('fade', { duration: ANIMATION_SPEED });
            }
        }, TOASTER_DURATION + 2000);
    } else {
        console.error(`${VERSION_TAG} Critical: Global Error Toaster elements missing.`);
        console.error("User Error Message:", message);
    }
}

function wireAuthEvents() {
    authentication.onLogin(async (member) => {
        try {
            console.log(`${VERSION_TAG} Login detected. Routing to profile.`);
            wixLocation.to('/profile');
        } catch (error) {
            console.error(`${VERSION_TAG} Login redirect failed:`, error);
            wixLocation.to('/cc');
        }
    });
}

async function handleLogout() {
    const redirectUrl = '/cc';
    try {
        console.log(`${VERSION_TAG} User initiating logout.`);
        await wixUsers.logout();
        wixLocation.to(redirectUrl);
    } catch (err) {
        console.error(`${VERSION_TAG} Logout failed:`, err);
        showError("Logout failed. Please refresh the page.");
    }
}

export async function showGlobalHeaderError(message) {
    const errorCell = $w('#ccGlobalHeaderError');
    const errorMsgEl = $w('#ccGlobalHeaderErrorMsg');

    if (errorCell && errorMsgEl) {
        errorMsgEl.text = message;
        await errorCell.expand(); 
        await errorCell.show("fade", { duration: 400 });
    }
}