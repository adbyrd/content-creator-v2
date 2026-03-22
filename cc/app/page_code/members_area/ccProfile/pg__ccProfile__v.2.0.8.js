/**
 * DISPLAY MEMBER DATA & BUSINESS SETTINGS
 * @version 2.0.8
 * @updated 2026-03-21
 */

import { currentMember } from 'wix-members-frontend';
import wixWindowFrontend from 'wix-window-frontend';
import wixLocation from 'wix-location';

// Backend Service Imports
import { getMemberBusinessProfile } from 'backend/memberData.web';

// User-facing constants & Assets per Standards
const MSG_LOAD_ERROR = "An unexpected error occurred while loading your profile.";
const DEFAULT_AVATAR = "https://static.wixstatic.com/media/155164_1f5df41ae90741139acb1148f2b4f864~mv2.png";
const DEFAULT_COVER = "https://static.wixstatic.com/media/155164_7b50fe484f8b47c0997728adc0ad9677~mv2.png";

// State variable to hold fetched profile for popup context injection
let _profileData = null;

$w.onReady(async function () {
    console.log('[cc-v2.1.0] Initializing Member Profile Page...');
    
    try {
        bootUI();
        
        // 1. Authenticate Member & Fetch Data
        const member = await currentMember.getMember({ fieldsets: ['FULL'] });
        if (!member) {
            console.warn('[cc-v2.1.0] No session found, redirecting...');
            return wixLocation.to('/login');
        }

        _profileData = await getMemberBusinessProfile();
        
        // 2. Hydrate UI elements
        hydrateProfile(member, _profileData);
        
        // 3. Setup Event Handlers for Popups
        wireActionHandlers();

    } catch (error) {
        console.error('[cc-v2.1.0] Initialization failed:', error);
        showError(MSG_LOAD_ERROR);
    }
});

/**
 * Maps Member and Collection data to the UI
 */
function hydrateProfile(member, businessData) {
    // A. Standard Wix Member Data
    const contact = member.contactDetails;
    safeSetText('#ccMemberName', `${contact.firstName} ${contact.lastName}`);
    safeSetImage('#ccProfilePhoto', member.profile?.profilePhoto?.url, DEFAULT_AVATAR);
    safeSetImage('#ccCoverPhoto', member.profile?.coverPhoto?.url, DEFAULT_COVER);

    // B. Contact Info (Emails/Phones from Wix)
    safeSetText('#ccDisplayCompanyEmail', contact.emails?.[0] || "No email on file");
    safeSetText('#ccDisplayCompanyPhone', contact.phones?.[0] || "No phone on file");

    // C. Custom Business Data (ccMembers Collection)
    if (businessData) {
        // Company Identifiers
        safeSetText('#ccDisplayCompanyName', businessData.ccComanyName || "Company Name Not Set");
        safeSetText('#ccDisplayCompanyURL', businessData.ccCompanyURL || "Website Not Set");
        safeSetText('#ccCompanyDescription', businessData.ccComanyDescription || "No description provided.");
        
        // If Company URL exists, set the link property
        if (businessData.ccCompanyURL && $w('#ccDisplayCompanyURL')) {
            $w('#ccDisplayCompanyURL').link = businessData.ccCompanyURL;
        }

        // Taxonomy Display (Humanized Slugs)
        safeSetText('#txtDisplayCategory', humanizeSlug(businessData.businessCategory));
        safeSetText('#txtDisplaySubCategory', humanizeSlug(businessData.businessSubCategory));
        safeSetText('#txtDisplayCustomerType', humanizeSlug(businessData.customerType));
    } else {
        console.info('[cc-v2.1.0] No record in ccMembers for this ID.');
        setEmptyBusinessState();
    }
}

/**
 * Wires buttons to open Lightboxes
 */
function wireActionHandlers() {
    // Edit Business Categories & Customer Type
    $w('#btnEditBusiness').onClick(async () => {
        const didSave = await wixWindowFrontend.openLightbox("Business Settings", _profileData);
        handlePopupResult(didSave);
    });

    // Edit Company Name, URL, Description, Zip
    $w('#btnEditCompany').onClick(async () => {
        const didSave = await wixWindowFrontend.openLightbox("Company Details", _profileData);
        handlePopupResult(didSave);
    });
}

/**
 * Reloads page if a popup successfully persisted data
 */
function handlePopupResult(success) {
    if (success) {
        console.log('[cc-v2.1.0] Data updated. Reloading for UI sync...');
        wixLocation.to(wixLocation.url); 
    }
}

/**
 * Standardized UI Bootstrap
 */
function bootUI() {
    safeHide('#ccGeneralError');
}

/**
 * Transforms technical-slugs to readable titles
 * e.g., "b2b-business" -> "B2b Business"
 */
function humanizeSlug(slug) {
    if (!slug) return "Not set";
    return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function setEmptyBusinessState() {
    safeSetText('#ccDisplayCompanyName', "Click 'Edit' to add company");
    safeSetText('#txtDisplayCategory', "Not selected");
}

/**
 * DEFENSIVE UI HELPERS
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