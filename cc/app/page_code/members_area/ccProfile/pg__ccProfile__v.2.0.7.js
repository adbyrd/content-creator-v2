/**
 * DISPLAY MEMBER DATA & BUSINESS SETTINGS
 * Version 2.0.7
 * @updated 2026-03-21
 */

import { currentMember } from 'wix-members-frontend';
import wixWindowFrontend from 'wix-window-frontend';
import wixLocation from 'wix-location';

// Backend Service Imports
import { getMemberBusinessProfile } from 'backend/memberData.web';

// User-facing constants per Standards
const MSG_LOAD_ERROR = "An unexpected error occurred while loading your profile.";
const DEFAULT_AVATAR = "https://static.wixstatic.com/media/155164_1f5df41ae90741139acb1148f2b4f864~mv2.png";
const DEFAULT_COVER = "https://static.wixstatic.com/media/155164_7b50fe484f8b47c0997728adc0ad9677~mv2.png";

// State variable to hold fetched profile for the popup context
let _profileData = null;

$w.onReady(async function () {
    console.log('[cc-v2.1.0] Initializing Member Profile Page...');
    
    try {
        bootUI();
        
        // 1. Authenticate Member
        const member = await currentMember.getMember({ fieldsets: ['FULL'] });
        if (!member) {
            console.warn('[cc-v2.1.0] No session found, redirecting...');
            return wixLocation.to('/login');
        }

        // 2. Fetch Custom Business Data from 'ccMembers'
        _profileData = await getMemberBusinessProfile();
        
        // 3. Hydrate the Page
        hydrateProfile(member, _profileData);
        
        // 4. Wire Event Handlers
        wirePageHandlers();

    } catch (error) {
        console.error('[cc-v2.1.0] Initialization failed:', error);
        showError(MSG_LOAD_ERROR);
    }
});

/**
 * Standardized UI Bootstrap
 */
function bootUI() {
    safeHide('#ccGeneralError');
    // Ensure static display elements are visible, and form elements are hidden if they exist on-page
    $w('#btnEditBusiness').enable();
}

/**
 * Maps both Wix Member data and Custom Collection data to the UI
 */
function hydrateProfile(member, businessData) {
    // A. Standard Wix Data
    const profile = member.contactDetails;
    safeSetText('#ccMemberName', `${profile.firstName} ${profile.lastName}`);
    safeSetImage('#ccProfilePhoto', member.profile?.profilePhoto?.url, DEFAULT_AVATAR);
    safeSetImage('#ccCoverPhoto', member.profile?.coverPhoto?.url, DEFAULT_COVER);

    // B. Custom Business Data (ccMembers)
    if (businessData) {
        safeSetText('#ccCompanyName', businessData.ccComanyName || "Company Name Not Set");
        safeSetText('#ccCompanyDescription', businessData.ccComanyDescription || "No description provided.");
        
        // Website Link logic
        if (businessData.ccCompanyURL) {
            $w('#ccCompanyURL').text = businessData.ccCompanyURL;
            $w('#ccCompanyURL').link = businessData.ccCompanyURL;
        } else {
            $w('#ccCompanyURL').text = "No website on file.";
        }

        // Dropdown Value Displays (Humanized)
        safeSetText('#txtDisplayCategory', humanizeSlug(businessData.businessCategory));
        safeSetText('#txtDisplaySubCategory', humanizeSlug(businessData.businessSubCategory));
        safeSetText('#txtDisplayCustomerType', humanizeSlug(businessData.customerType));
    } else {
        console.log('[cc-v2.1.0] No business profile found for this member.');
        setEmptyState();
    }
}

/**
 * Sets up the button logic for the popup
 */
function wirePageHandlers() {
    $w('#btnEditBusiness').onClick(async () => {
        console.log('[cc-v2.1.0] Opening Business Settings Popup...');
        
        // Pass current data to the lightbox so the form is pre-filled
        const didSave = await wixWindowFrontend.openLightbox("Business Settings", _profileData);
        
        if (didSave) {
            console.log('[cc-v2.1.0] Settings updated. Reloading page...');
            wixLocation.to(wixLocation.url); // Reload to show static saved values
        } else {
            console.log('[cc-v2.1.0] User cancelled or closed the popup without saving.');
        }
    });
}

/**
 * Helper to display technical slugs as readable titles
 */
function humanizeSlug(slug) {
    if (!slug || slug === '') return "Not selected";
    return slug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function setEmptyState() {
    safeSetText('#txtDisplayCategory', "Not set");
    safeSetText('#txtDisplaySubCategory', "Not set");
    safeSetText('#txtDisplayCustomerType', "Not set");
}

/**
 * UI Utility Helpers
 */
function safeSetText(selector, value) {
    const el = $w(selector);
    if (el) el.text = value;
}

function safeSetImage(selector, src, fallback) {
    const el = $w(selector);
    if (el) el.src = src || fallback;
}

function safeHide(selector) {
    const el = $w(selector);
    if (el && typeof el.hide === 'function') el.hide();
}

function showError(msg) {
    const errEl = $w('#ccGeneralError');
    if (errEl) {
        errEl.text = msg;
        errEl.show();
    }
}