/**
 * DISPLAY MEMBER DATA & BUSINESS SETTINGS
 * @version 2.1.1
 * @updated 2026-03-21
 */

import { currentMember } from 'wix-members-frontend';
import wixWindowFrontend from 'wix-window-frontend';
import wixLocation from 'wix-location';

// Backend Service Imports
import { getMemberBusinessProfile } from 'backend/ccMembers.web';

// User-facing constants per CC Standards
const MSG_LOAD_ERROR = "An unexpected error occurred while loading your profile.";
const DEFAULT_AVATAR = "https://static.wixstatic.com/media/155164_1f5df41ae90741139acb1148f2b4f864~mv2.png";

// State variable to hold fetched profile for popup context injection
let _profileData = null;

$w.onReady(async function () {
    console.log('[cc-v2.1.2] Initializing Member Profile Page...');
    
    try {
        bootUI();
        
        // 1. Authenticate Member
        const member = await currentMember.getMember({ fieldsets: ['FULL'] });
        if (!member) {
            console.warn('[cc-v2.1.2] No session found, redirecting...');
            return wixLocation.to('/login');
        }

        // 2. Fetch Business Data from 'ccMembers' collection
        _profileData = await getMemberBusinessProfile();
        
        // 3. Populate the UI
        hydrateProfile(member, _profileData);
        
        // 4. Initialize Buttons
        wireActionHandlers();

    } catch (error) {
        console.error('[cc-v2.1.2] Initialization failed:', error);
        showError(MSG_LOAD_ERROR);
    }
});

/**
 * Maps both Wix Auth data and Custom Collection data to the UI elements.
 */
function hydrateProfile(member, businessData) {
    const contact = member.contactDetails;
    
    // Header Data (Wix Native)
    safeSetText('#ccMemberName', `${contact.firstName} ${contact.lastName}`);

    if (businessData) {
        // Map Custom Company logo to the profile avatar element
        safeSetImage('#ccCompanyLogo', businessData.ccCompanyLogo, DEFAULT_AVATAR);
        
        // ADD THIS LINE HERE:
        safeSetText('#ccDisplayCompanyDescription', businessData.ccComanyDescription || "No Company Description On File.");

        // --- COMPANY DETAILS ---
        // Property names follow the CSV schema (including 'Comany' typos)
        safeSetText('#ccDisplayCompanyName', businessData.ccComanyName || "Company Name Not Set");
        safeSetText('#ccDisplayCompanyZipCode', businessData.ccComanyZipCode || "No Company Zip Code On File.");
        
        // URL Button Logic
        if ($w('#ccDisplayCompanyURL')) {
            const url = businessData.ccCompanyURL;
            $w('#ccDisplayCompanyURL').label = url || "No URL Provided";
            if (url) $w('#ccDisplayCompanyURL').link = url;
        }

        // Email & Phone (Custom Source - Issue 005)
        safeSetText('#ccDisplayCompanyEmail', businessData.ccCompanyEmail || "No Company Email On File");
        safeSetText('#ccDisplayCompanyPhone', businessData.ccCompanyPhone || "No Company Phone On File");

        // --- TAXONOMY ---
        safeSetText('#txtDisplayCategory', businessData.businessCategory ? humanizeSlug(businessData.businessCategory) : "No Business Category On File");
        safeSetText('#txtDisplaySubCategory', businessData.businessSubCategory ? humanizeSlug(businessData.businessSubCategory) : "No Business Sub Category On File");
        safeSetText('#txtDisplayCustomerType', businessData.customerType ? humanizeSlug(businessData.customerType) : "Your Customer Type Has Not Been Selected.");
        
    } else {
        console.info('[cc-v2.1.2] No business profile found, setting empty state.');
        setEmptyState();
    }
}

/**
 * Attaches click listeners to popup triggers
 */
function wireActionHandlers() {
    // 001. Logo Upload Trigger
    $w('#btnUploadLogo').onClick(async () => {
        const didSave = await wixWindowFrontend.openLightbox("Company Logo", _profileData);
        handlePopupResult(didSave);
    });

    // Business Settings Trigger
    $w('#btnEditBusiness').onClick(async () => {
        const didSave = await wixWindowFrontend.openLightbox("Business Settings", _profileData);
        handlePopupResult(didSave);
    });

    // Company Details Trigger
    $w('#btnEditCompany').onClick(async () => {
        const didSave = await wixWindowFrontend.openLightbox("Company Details", _profileData);
        handlePopupResult(didSave);
    });
}

/**
 * Standardized response handler for all profile-related popups
 */
function handlePopupResult(success) {
    if (success) {
        console.log('[cc-v2.1.2] Success detected. Reloading page for UI sync...');
        wixLocation.to(wixLocation.url); 
    }
}

/**
 * UI HELPERS
 * -----------------------------------------------------------------------
 */
function humanizeSlug(slug) {
    if (!slug || slug === '') return "";
    return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function safeSetText(selector, value) {
    const el = $w(selector);
    if (el) el.text = value;
}

function safeSetImage(selector, src, fallback) {
    const el = $w(selector);
    if (el) el.src = src || fallback;
}

function bootUI() {
    const err = $w('#ccGeneralError');
    if (err) err.hide();
}

function setEmptyState() {
    safeSetImage('#ccCompanyLogo', null, DEFAULT_AVATAR);
    safeSetText('#ccDisplayCompanyName', "Company Name Not Set");
    safeSetText('#ccDisplayCompanyZipCode', "No Company Zip Code On File.");
    safeSetText('#txtDisplayCategory', "No Business Category On File");
    safeSetText('#txtDisplaySubCategory', "No Business Sub Category On File");
    safeSetText('#txtDisplayCustomerType', "Your Customer Type Has Not Been Selected.");
    safeSetText('#ccDisplayCompanyDescription', "No Company Description On File.");
}

function showError(msg) {
    const errEl = $w('#ccGeneralError');
    if (errEl) {
        errEl.text = msg;
        errEl.show();
    }
}