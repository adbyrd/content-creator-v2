/**
 * MEMBER PROFILE PAGE
 * Handles business profile display and editing via Lightboxes.
 * @version 2.4.0
 */

import { currentMember } from 'wix-members-frontend';
import wixWindowFrontend from 'wix-window-frontend';
import { getMemberBusinessProfile } from 'backend/ccMembers.web';
import { showSuccess, showError } from 'public/pages/masterPage.js';

const VERSION_TAG = '[ccProfile-v2.4.0]';
const MSG_AUTH_ERROR = "Session expired. Please log in again to access your profile.";
const MSG_LOAD_ERROR = "We couldn't load your profile data. Please refresh the page.";
const MSG_UPDATE_SUCCESS = "Your Profile Has Been Updated Successfully";
const DEFAULT_AVATAR = "https://static.wixstatic.com/media/155164_1f5df41ae90741139acb1148f2b4f864~mv2.png";

let _profileData = null;

$w.onReady(async function () {
    console.log(`${VERSION_TAG} Initialization Started`);
    
    bootUI(); 

    try {
        const member = await currentMember.getMember({ fieldsets: ['FULL'] });
        
        if (!member) {
            console.warn(`${VERSION_TAG} No active session found.`);
            showError(MSG_AUTH_ERROR);
            return; 
        }

        const isDataLoaded = await refreshProfileData(member.loginEmail);
        
        if (isDataLoaded) {
            wireActionHandlers();
        }

    } catch (error) {
        console.error(`${VERSION_TAG} Global Initialization Failed:`, error);
        showError(MSG_LOAD_ERROR);
    }
});

function bootUI() {
    safeSetText('#ccBusinessName', "Loading...");
}

async function refreshProfileData(email) {
    try {
        const response = await getMemberBusinessProfile(email);
        
        if (response && response.ok) {
            _profileData = response.data;
            renderProfile(_profileData);
            return true;
        } else {
            throw new Error(response?.error?.message || "Data mismatch");
        }
    } catch (err) {
        console.error(`${VERSION_TAG} refreshProfileData failed:`, err);
        showError(MSG_LOAD_ERROR);
        return false;
    }
}

function renderProfile(profile) {
    if (!profile) return;
    safeSetText('#ccBusinessName', profile.companyName || "No Company Name Set");
    safeSetText('#ccMemberEmail', profile.memberId);
    safeSetText('#ccCompanyEmail', profile.companyEmail);
    safeSetText('#ccDescription', profile.description);
    safeSetImage('#ccBusinessLogo', profile.companyLogo, DEFAULT_AVATAR);
}

function wireActionHandlers() {
    $w('#btnEditDetails').onClick(async () => {
        const result = await wixWindowFrontend.openLightbox("Company Details", _profileData);
        handlePopupResult(result);
    });

    $w('#btnEditBusiness').onClick(async () => {
        const result = await wixWindowFrontend.openLightbox("Business Settings", _profileData);
        handlePopupResult(result);
    });

    $w('#btnUploadLogo').onClick(async () => {
        const result = await wixWindowFrontend.openLightbox("Company Brand", _profileData);
        handlePopupResult(result);
    });
}

async function handlePopupResult(result) {
    if (result && result.success) {
        showSuccess(MSG_UPDATE_SUCCESS);
        
        const member = await currentMember.getMember();
        await refreshProfileData(member.loginEmail);
    }
}

/**
 * --- UTILS (Safe UI Manipulation) ---
 */

function safeSetText(selector, value) {
    const el = $w(selector);
    if (el) {
        el.text = value || "";
    } else {
        console.warn(`${VERSION_TAG} Selector ${selector} not found on page.`);
    }
}

function safeSetImage(selector, src, fallback) {
    const el = $w(selector);
    if (el) {
        el.src = src || fallback;
    }
}