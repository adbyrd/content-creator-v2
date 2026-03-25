/**
 * DISPLAY MEMBER DATA & BUSINESS SETTINGS
 * @version 2.2.0
 * @updated 2026-03-21
 */

import { currentMember } from 'wix-members-frontend';
import wixWindowFrontend from 'wix-window-frontend';

// Backend Service Imports
import { getMemberBusinessProfile } from 'backend/ccMembers.web';

// User-facing constants per CC Standards [cite: 24, 151]
const MSG_LOAD_ERROR = "An unexpected error occurred while loading your profile.";
const MSG_UPDATE_SUCCESS = "Your Profile Has Been Updated";
const DEFAULT_AVATAR = "https://static.wixstatic.com/media/155164_1f5df41ae90741139acb1148f2b4f864~mv2.png";

// State variable to hold fetched profile [cite: 43]
let _profileData = null;

$w.onReady(async function () {
    console.log('[cc-v2.2.0] Initializing Member Profile Page...');
    
    try {
        bootUI();
        
        // 1. Authenticate Member
        const member = await currentMember.getMember({ fieldsets: ['FULL'] });
        if (!member) {
            console.warn('[cc-v2.2.0] No session found.');
            return; 
        }

        // 2. Fetch and Display Data [cite: 39]
        await refreshProfileData(member);
        
        // 3. Initialize Buttons [cite: 38]
        wireActionHandlers();

    } catch (error) {
        console.error('[cc-v2.2.0] Initialization failed:', error);
        showError(MSG_LOAD_ERROR);
    }
});

/**
 * Fetches fresh data from the backend and hydrates the UI [cite: 66, 171]
 */
async function refreshProfileData(member) {
    _profileData = await getMemberBusinessProfile();
    hydrateProfile(member, _profileData);
}

/**
 * Maps both Wix Auth data and Custom Collection data to UI elements [cite: 46]
 */
function hydrateProfile(member, businessData) {
    const contact = member.contactDetails;
    
    // Header Data
    safeSetText('#ccMemberName', `${contact.firstName} ${contact.lastName}`);

    if (businessData) {
        safeSetImage('#ccCompanyLogo', businessData.ccCompanyLogo, DEFAULT_AVATAR);
        safeSetText('#ccDisplayCompanyDescription', businessData.ccComanyDescription || "No Company Description On File.");
        safeSetText('#ccDisplayCompanyName', businessData.ccComanyName || "Company Name Not Set");
        safeSetText('#ccDisplayCompanyZipCode', businessData.ccComanyZipCode || "No Company Zip Code On File.");
        
        if ($w('#ccDisplayCompanyURL')) {
            const url = businessData.ccCompanyURL;
            $w('#ccDisplayCompanyURL').label = url || "No URL Provided";
            if (url) $w('#ccDisplayCompanyURL').link = url;
        }

        safeSetText('#ccDisplayCompanyEmail', businessData.ccCompanyEmail || "No Company Email On File");
        safeSetText('#ccDisplayCompanyPhone', businessData.ccCompanyPhone || "No Company Phone On File");

        // Taxonomy [cite: 139]
        safeSetText('#txtDisplayCategory', businessData.businessCategory ? humanizeSlug(businessData.businessCategory) : "No Category");
        safeSetText('#txtDisplaySubCategory', businessData.businessSubCategory ? humanizeSlug(businessData.businessSubCategory) : "No Sub Category");
        safeSetText('#txtDisplayCustomerType', businessData.customerType ? humanizeSlug(businessData.customerType) : "Type Not Selected");
        
    } else {
        setEmptyState();
    }
}

/**
 * Standardized response handler for all profile-related popups [cite: 11, 173]
 */
async function handlePopupResult(success) {
    if (success) {
        console.log('[cc-v2.2.0] Update successful. Refreshing UI...');
        
        // Re-authenticate and refresh data without page reload
        const member = await currentMember.getMember({ fieldsets: ['FULL'] });
        await refreshProfileData(member);
        
        showSuccess(MSG_UPDATE_SUCCESS);
    }
}

/**
 * UI HELPERS [cite: 46-52, 152-155]
 * -----------------------------------------------------------------------
 */

function showSuccess(msg) {
    const successEl = $w('#ccSuccessToaster'); // Standardized Selector [cite: 25]
    if (successEl) {
        successEl.text = msg;
        successEl.show();
        // Auto-hide after 4 seconds 
        setTimeout(() => successEl.hide('fade'), 4000);
    }
}

function showError(msg) {
    const errEl = $w('#ccGeneralError');
    if (errEl) {
        errEl.text = msg;
        errEl.show();
    }
}

function safeSetText(selector, value) {
    const el = $w(selector);
    if (el) el.text = value;
}

function safeSetImage(selector, src, fallback) {
    const el = $w(selector);
    if (el) el.src = src || fallback;
}

function humanizeSlug(slug) {
    if (!slug) return "";
    return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function bootUI() {
    if ($w('#ccGeneralError')) $w('#ccGeneralError').hide();
    if ($w('#ccSuccessToaster')) $w('#ccSuccessToaster').hide();
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

    $w('#btnEditCompany').onClick(async () => {
        const result = await wixWindowFrontend.openLightbox("Company Details", _profileData);
        handlePopupResult(result);
    });
}

function setEmptyState() {
    safeSetImage('#ccCompanyLogo', null, DEFAULT_AVATAR);
    safeSetText('#ccDisplayCompanyName', "Company Name Not Set");
    // ... remaining empty state assignments
}