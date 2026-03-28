/**
 * MEMBER PROFILE PAGE
 * Handles business profile display and editing via Lightboxes.
 * @version 2.3.0
 */

import { currentMember } from 'wix-members-frontend';
import wixWindowFrontend from 'wix-window-frontend';
import { getMemberBusinessProfile } from 'backend/ccMembers.web';
import { showSuccess, showError } from 'public/pages/masterPage.js';

const VERSION_TAG = '[ccProfile-v2.3.0]';
const MSG_AUTH_ERROR = "Session expired. Please log in again to access your profile.";
const MSG_LOAD_ERROR = "We couldn't load your profile data. Please refresh.";
const MSG_UPDATE_SUCCESS = "Your Profile Has Been Updated Successfully";
const DEFAULT_AVATAR = "https://static.wixstatic.com/media/155164_1f5df41ae90741139acb1148f2b4f864~mv2.png";

let _profileData = null;

$w.onReady(async function () {
    console.log(`${VERSION_TAG} Initializing Profile Page...`);
    
    bootUI(); 

    try {
        const member = await currentMember.getMember({ fieldsets: ['FULL'] });
        if (!member) {
            console.warn(`${VERSION_TAG} No active session found.`);
            showError(MSG_AUTH_ERROR);
            return; 
        }

        const isDataLoaded = await refreshProfileData(member);
        
        if (isDataLoaded) {
            wireActionHandlers();
        }

    } catch (error) {
        console.error(`${VERSION_TAG} System Initialization Failed:`, error);
        showError(MSG_LOAD_ERROR);
    }
});

function bootUI() {
    $w('#ccProfileLoading').show();
}

async function refreshProfileData(member) {
    try {
        const profileResponse = await getMemberBusinessProfile(member._id);
        
        if (profileResponse.ok) {
            _profileData = profileResponse.data;
            renderProfileView(_profileData, member);
            return true;
        } else {
            throw new Error(profileResponse.error.message);
        }
    } catch (err) {
        console.error(`${VERSION_TAG} Data Fetch Error:`, err);
        showError(MSG_LOAD_ERROR);
        return false;
    } finally {
        $w('#ccProfileLoading').hide();
    }
}

function renderProfileView(profile, member) {
    const { contactDetails } = member;
    
    safeSetText('#ccMemberName', `${contactDetails.firstName} ${contactDetails.lastName}`);
    safeSetText('#ccMemberEmail', contactDetails.primaryEmail);
    
    safeSetText('#ccBusinessName', profile?.businessName || "No Business Name Set");
    safeSetText('#ccBusinessSlug', humanizeSlug(profile?.slug));
    
    safeSetImage('#ccBusinessLogo', profile?.logo, DEFAULT_AVATAR);
}

async function handlePopupResult(result) {
    if (result && result.success) {
        showSuccess(MSG_UPDATE_SUCCESS);
        
        const member = await currentMember.getMember({ fieldsets: ['FULL'] });
        await refreshProfileData(member);
    }
}

function wireActionHandlers() {
    $w('#btnUploadLogo').onClick(async () => {
        const result = await wixWindowFrontend.openLightbox("Company Logo", _profileData);
        handlePopupResult(result);
    });

    $w('#btnEditBusiness').onClick(async () => {
        const result = await wixWindowFrontend.openLightbox("Business Settings", _profileData);
        handlePopupResult(result);
    });
}

/**
 * UTILS (Safe UI Manipulation)
 * -----------------------------------------------------------------------
 */

function safeSetText(selector, value) {
    const el = $w(selector);
    if (el) el.text = value || "";
}

function safeSetImage(selector, src, fallback) {
    const el = $w(selector);
    if (el) el.src = src || fallback;
}

function humanizeSlug(slug) {
    if (!slug) return "";
    return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}