/**
 * DISPLAY MEMBER DATA & BUSINESS SETTINGS
 * @version 2.2.2
 * @updated 2026-03-25
 */

import { currentMember } from 'wix-members-frontend';
import wixWindowFrontend from 'wix-window-frontend';

// Backend Service Imports
import { getMemberBusinessProfile } from 'backend/ccMembers.web';

// User-facing constants per CC Standards [cite: 188, 328]
const MSG_SYSTEM_ERROR = "Something went wrong while loading your profile. Please contact support or try again later.";
const MSG_AUTH_ERROR = "Session expired. Please log in again to access your profile.";
const MSG_UPDATE_SUCCESS = "Your Profile Has Been Updated";
const DEFAULT_AVATAR = "https://static.wixstatic.com/media/155164_1f5df41ae90741139acb1148f2b4f864~mv2.png";

// State variable to hold fetched profile [cite: 220]
let _profileData = null;

$w.onReady(async function () {
    console.log('[cc-v2.2.2] Initializing Member Profile Page...');
    
    try {
        bootUI(); // Hide messaging components initially [cite: 213]
        
        // 1. Authenticate Member
        const member = await currentMember.getMember({ fieldsets: ['FULL'] });
        if (!member) {
            console.warn('[cc-v2.2.2] No session found.');
            showSystemError(MSG_AUTH_ERROR);
            return; 
        }

        // 2. Fetch and Display Data [cite: 216]
        const isDataLoaded = await refreshProfileData(member);
        
        // 3. Initialize Interactive Elements only if load was successful
        if (isDataLoaded) {
            wireActionHandlers();
        }

    } catch (error) {
        console.error('[cc-v2.2.2] System Initialization Failed:', error);
        showSystemError(MSG_SYSTEM_ERROR);
    }
});

/**
 * UI STATE MANAGEMENT
 * -----------------------------------------------------------------------
 */

/**
 * Triggers the Persistent Error Section for system-level failures.
 * Hierarchy: #ccErrors (Section) > #ccErrorMsg (Text)
 */
function showSystemError(msg) {
    const errorSection = $w('#ccErrors');
    const errorMsgEl = $w('#ccErrorMsg');

    if (errorSection && errorMsgEl) {
        errorMsgEl.text = msg;
        // Persistent reveal with standard fade [cite: 330, 350]
        errorSection.show("fade", { duration: 400 });
        
        // Defensive: Collapse the main content area to focus user on the error state [cite: 229]
        if ($w('#ccProfileContent')) $w('#ccProfileContent').collapse();
    }
}

/**
 * Triggers the Transient Success Toaster for action feedback.
 * Hierarchy: #ccSuccessToaster (Section) > #ccSuccessMsg (Text)
 */
function showSuccess(msg) {
    const toaster = $w('#ccSuccessToaster');
    const msgEl = $w('#ccSuccessMsg');

    if (toaster && msgEl) {
        msgEl.text = msg;
        toaster.show("fade", { duration: 300 });

        // Transient behavior: Auto-hide after delay [cite: 332]
        setTimeout(() => {
            toaster.hide("fade", { duration: 2000 }); // Smooth 2s disappearance
        }, 3500);
    }
}

/**
 * Prepares the UI by ensuring all conditional sections are hidden [cite: 213]
 */
function bootUI() {
    if ($w('#ccSuccessToaster')) $w('#ccSuccessToaster').hide();
    if ($w('#ccErrors')) $w('#ccErrors').hide();
    
    // Ensure content is expanded unless a system error occurs
    if ($w('#ccProfileContent')) $w('#ccProfileContent').expand();
}

/**
 * DATA HYDRATION LOGIC
 * -----------------------------------------------------------------------
 */

/**
 * Fetches fresh data and handles the structured response from backend v2.2.2 
 */
async function refreshProfileData(member) {
    const response = await getMemberBusinessProfile();
    
    if (response.ok) {
        _profileData = response.data;
        hydrateProfile(member, _profileData);
        return true;
    } else {
        console.error(`[cc-v2.2.2] Data retrieval failed: ${response.error?.type}`);
        showSystemError(response.error?.message || MSG_SYSTEM_ERROR);
        return false;
    }
}

function hydrateProfile(member, businessData) {
    const contact = member.contactDetails;
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

        // Taxonomy conversion [cite: 316]
        safeSetText('#txtDisplayCategory', businessData.businessCategory ? humanizeSlug(businessData.businessCategory) : "No Category");
        safeSetText('#txtDisplaySubCategory', businessData.businessSubCategory ? humanizeSlug(businessData.businessSubCategory) : "No Sub Category");
        safeSetText('#txtDisplayCustomerType', businessData.customerType ? humanizeSlug(businessData.customerType) : "Type Not Selected");
    } else {
        setEmptyState();
    }
}

/**
 * Response handler for lightbox updates
 */
async function handlePopupResult(success) {
    if (success) {
        console.log('[cc-v2.2.2] Success detected. Re-syncing profile state...');
        const member = await currentMember.getMember({ fieldsets: ['FULL'] });
        await refreshProfileData(member);
        showSuccess(MSG_UPDATE_SUCCESS);
    }
}

function safeSetText(selector, value) {
    const el = $w(selector);
    if (el) el.text = value; // [cite: 223]
}

function safeSetImage(selector, src, fallback) {
    const el = $w(selector);
    if (el) el.src = src || fallback;
}

function humanizeSlug(slug) {
    if (!slug) return "";
    return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
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
}