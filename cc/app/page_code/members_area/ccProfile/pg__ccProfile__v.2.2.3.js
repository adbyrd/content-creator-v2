/**
 * DISPLAY MEMBER DATA & BUSINESS SETTINGS
 * @version 2.2.3
 * @updated 2026-03-25
 */

import { currentMember } from 'wix-members-frontend';
import wixWindowFrontend from 'wix-window-frontend';

// Backend Service Imports
import { getMemberBusinessProfile } from 'backend/ccMembers.web';

// Standardized System Messages
const MSG_SYSTEM_ERROR = "Something went wrong while loading your profile. Please contact support or try again later.";
const MSG_AUTH_ERROR = "Session expired. Please log in again to access your profile.";
const MSG_UPDATE_SUCCESS = "Your Profile Has Been Updated";
const DEFAULT_AVATAR = "https://static.wixstatic.com/media/155164_1f5df41ae90741139acb1148f2b4f864~mv2.png";

let _profileData = null;

$w.onReady(async function () {
    console.log('[cc-v2.2.3] Initializing Member Profile Page...');
    
    // 0. Immediate UI Bootstrap to prevent layout shifting
    bootUI(); 

    try {
        // 1. Authenticate Member
        const member = await currentMember.getMember({ fieldsets: ['FULL'] });
        if (!member) {
            console.warn('[cc-v2.2.3] No session found.');
            showSystemError(MSG_AUTH_ERROR);
            return; 
        }

        // 2. Fetch and Display Data
        const isDataLoaded = await refreshProfileData(member);
        
        // 3. Initialize Interactive Elements
        if (isDataLoaded) {
            wireActionHandlers();
        }

    } catch (error) {
        console.error('[cc-v2.2.3] System Initialization Failed:', error);
        showSystemError(MSG_SYSTEM_ERROR);
    }
});

/**
 * UI STATE MANAGEMENT (Space-Aware)
 * -----------------------------------------------------------------------
 */

/**
 * Triggers the Persistent Error Section.
 * Reclaims page space using .expand()
 * Hierarchy: #ccErrors (Section) > #ccErrorMsg (Text)
 */
async function showSystemError(msg) {
    const errorSection = $w('#ccErrors');
    const errorMsgEl = $w('#ccErrorMsg');

    if (errorSection && errorMsgEl) {
        errorMsgEl.text = msg;
        
        // Ensure section takes up space before showing
        await errorSection.expand(); 
        errorSection.show("fade", { duration: 400 });
        
        // Hide/Collapse main content to focus on error state
        if ($w('#ccProfileContent')) {
            $w('#ccProfileContent').hide();
            $w('#ccProfileContent').collapse();
        }
    }
}

/**
 * Triggers the Transient Success Toaster.
 * Expands to show, then collapses to remove from HTML flow after fade.
 * Hierarchy: #ccSuccessToaster (Section) > #ccSuccessMsg (Text)
 */
async function showSuccess(msg) {
    const toaster = $w('#ccSuccessToaster');
    const msgEl = $w('#ccSuccessMsg');

    if (toaster && msgEl) {
        msgEl.text = msg;
        
        // Expand to reclaim layout space
        await toaster.expand();
        await toaster.show("fade", { duration: 300 });

        // Wait 3.5s then start slow disappear
        setTimeout(async () => {
            // Fade out over 2 seconds
            await toaster.hide("fade", { duration: 2000 });
            // Remove from layout flow entirely (display: none)
            toaster.collapse(); 
        }, 3500);
    }
}

/**
 * Prepares the UI by collapsing all conditional messaging sections.
 */
function bootUI() {
    // Force collapse to ensure no empty space is reserved on load
    if ($w('#ccSuccessToaster')) {
        $w('#ccSuccessToaster').hide();
        $w('#ccSuccessToaster').collapse();
    }
    
    if ($w('#ccErrors')) {
        $w('#ccErrors').hide();
        $w('#ccErrors').collapse();
    }
    
    if ($w('#ccProfileContent')) {
        $w('#ccProfileContent').show();
        $w('#ccProfileContent').expand();
    }
}

/**
 * DATA HYDRATION LOGIC
 * -----------------------------------------------------------------------
 */

async function refreshProfileData(member) {
    const response = await getMemberBusinessProfile();
    
    if (response.ok) {
        _profileData = response.data;
        hydrateProfile(member, _profileData);
        return true;
    } else {
        showSystemError(response.error?.message || MSG_SYSTEM_ERROR);
        return false;
    }
}

function hydrateProfile(member, businessData) {
    const contact = member.contactDetails;
    safeSetText('#ccMemberName', `${contact.firstName} ${contact.lastName}`);

    if (businessData) {
        // Ensure system error is gone if we are hydrating successfully
        if ($w('#ccErrors')) $w('#ccErrors').collapse();
        if ($w('#ccProfileContent')) $w('#ccProfileContent').expand();

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
        const member = await currentMember.getMember({ fieldsets: ['FULL'] });
        await refreshProfileData(member);
        showSuccess(MSG_UPDATE_SUCCESS);
    }
}

/**
 * UTILS
 * -----------------------------------------------------------------------
 */

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