/**
 * DISPLAY MEMBER DATA & BUSINESS SETTINGS
 * @version 2.0.9
 * @updated 2026-03-21
 */

import { currentMember } from 'wix-members-frontend';
import wixWindowFrontend from 'wix-window-frontend';
import wixLocation from 'wix-location';

// Backend Service Imports
import { getMemberBusinessProfile } from 'backend/ccMembers.web';

// User-facing constants per Standards
const MSG_LOAD_ERROR = "An unexpected error occurred while loading your profile.";
const DEFAULT_AVATAR = "https://static.wixstatic.com/media/155164_1f5df41ae90741139acb1148f2b4f864~mv2.png";
const DEFAULT_COVER = "https://static.wixstatic.com/media/155164_7b50fe484f8b47c0997728adc0ad9677~mv2.png";

// State variable to hold fetched profile for the popup context injection
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
        
        // 3. Hydrate the Page with data and fallbacks
        hydrateProfile(member, _profileData);
        
        // 4. Wire Event Handlers for Popups
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
}

/**
 * Maps Wix Member data and Custom Collection data to the UI with specific fallback logic
 */
function hydrateProfile(member, businessData) {
    // A. Standard Wix Member Identity
    const profile = member.contactDetails;
    safeSetText('#ccMemberName', `${profile.firstName} ${profile.lastName}`);
    safeSetImage('#ccProfilePhoto', member.profile?.profilePhoto?.url, DEFAULT_AVATAR);
    safeSetImage('#ccCoverPhoto', member.profile?.coverPhoto?.url, DEFAULT_COVER);

    // B. Business Data Hydration (Issue 001 - 008)
    if (businessData) {
        // Company Name
        safeSetText('#ccDisplayCompanyName', businessData.ccComanyName || "Company Name Not Set");

        // Issue 002: URL Button Logic
        const urlValue = businessData.ccCompanyURL;
        const btnUrl = $w('#ccDisplayCompanyURL');
        if (btnUrl) {
            btnUrl.label = urlValue || "No URL Provided";
            if (urlValue) btnUrl.link = urlValue;
        }

        // Issue 005: Email & Phone from CC Members Collection
        safeSetText('#ccDisplayCompanyEmail', businessData.ccCompanyEmail || "No Company Email On File");
        safeSetText('#ccDisplayCompanyPhone', businessData.ccCompanyPhone || "No Company Phone On File");

        // Issue 003 & 004: Zip Code Logic
        safeSetText('#ccDisplayCompanyZipCode', businessData.ccComanyZipCode || "No Company Zip Code On File.");

        // Issue 006: Primary Business Category Fallback
        safeSetText('#txtDisplayCategory', businessData.businessCategory ? humanizeSlug(businessData.businessCategory) : "No Business Category On File");

        // Issue 007: Secondary Business Category Fallback
        safeSetText('#txtDisplaySubCategory', businessData.businessSubCategory ? humanizeSlug(businessData.businessSubCategory) : "No Business Sub Category On File");

        // Issue 008: Customer Type Fallback
        safeSetText('#txtDisplayCustomerType', businessData.customerType ? humanizeSlug(businessData.customerType) : "Your Customer Type Has Not Been Selected.");

        // General Description
        safeSetText('#ccCompanyDescription', businessData.ccComanyDescription || "No description provided.");
    } else {
        console.log('[cc-v2.1.0] No business record found. Displaying empty state fallbacks.');
        setEmptyState();
    }
}

/**
 * Sets up button logic for the two specialized popups
 */
function wirePageHandlers() {
    // Business Settings Popup (Categories / Customer Type)
    $w('#btnEditBusiness').onClick(async () => {
        const didSave = await wixWindowFrontend.openLightbox("Business Settings", _profileData);
        if (didSave) reloadPage();
    });

    // Company Details Popup (Name, URL, Zip, Email, Phone, Description)
    $w('#btnEditCompany').onClick(async () => {
        const didSave = await wixWindowFrontend.openLightbox("Company Details", _profileData);
        if (didSave) reloadPage();
    });
}

/**
 * Ensures data consistency by reloading the current page
 */
function reloadPage() {
    console.log('[cc-v2.1.0] Success detected. Reloading page for UI sync...');
    wixLocation.to(wixLocation.url);
}

/**
 * Fallback values when no record exists at all
 */
function setEmptyState() {
    safeSetText('#ccDisplayCompanyName', "Company Name Not Set");
    safeSetText('#ccDisplayCompanyZipCode', "No Company Zip Code On File.");
    safeSetText('#txtDisplayCategory', "No Business Category On File");
    safeSetText('#txtDisplaySubCategory', "No Business Sub Category On File");
    safeSetText('#txtDisplayCustomerType', "Your Customer Type Has Not Been Selected.");
    safeSetText('#ccDisplayCompanyEmail', "No Company Email On File");
    safeSetText('#ccDisplayCompanyPhone', "No Company Phone On File");
}

/**
 * Helper to display technical slugs as readable titles
 */
function humanizeSlug(slug) {
    if (!slug || slug === '') return "";
    return slug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
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