/**
 * DISPLAY MEMBER DATA
 * Displays both FullData and PrivateMemberData collections
 * @version 2.0.4
 * @updated 2026-03-18
 */

import { currentMember } from 'wix-members-frontend';

// Global Constants per Standards
const MSG_LOAD_ERROR = "An unexpected error occurred while loading your profile.";
const MSG_NOT_LOGGED_IN = "Please log in to view your account details.";
const NO_DATA_SUFFIX = "on file.";
const DEFAULT_AVATAR = "https://static.wixstatic.com/media/ae928a_07a0f622d9924c528659556114e91851~mv2.png";

$w.onReady(async function () {
    console.log('[cc-v2.0.4] Initializing Profile Page...'); // Standardized Logging
    
    try {
        bootUI(); // Standards-based UI reset 
        
        const member = await currentMember.getMember({ fieldsets: ['FULL'] });

        if (member) {
            hydrateProfile(member);
        } else {
            console.warn('[cc-v2.0.4] hydrateProfile: No active session.');
            showError(MSG_NOT_LOGGED_IN);
        }
    } catch (err) {
        console.error('[cc-v2.0.4] Global initialization failure:', err); // Standardized Error Logging
        showError(MSG_LOAD_ERROR);
    }
});

/**
 * Maps the member object to UI elements using safe manipulation
 */
function hydrateProfile(member) {
    const { contactDetails, profile, loginEmail, status, lastLoginDate, language, slug: privateSlug } = member;
    const customFields = contactDetails?.customFields || {};

    // Internal helper for localized placeholder logic 
    const getSafeValue = (val, label) => (val && val !== "") ? val : `There is no ${label} ${NO_DATA_SUFFIX}`;

    // --- 1. Core Identity & Slug Handling ---
    const fullName = (contactDetails?.firstName || contactDetails?.lastName) 
        ? `${contactDetails.firstName || ''} ${contactDetails.lastName || ''}`.trim() 
        : profile?.nickname;
    
    safeSetText('#ccName', getSafeValue(fullName, "name"));
    safeSetText('#ccFirstName', getSafeValue(contactDetails?.firstName, "first name"));
    safeSetText('#ccLastName', getSafeValue(contactDetails?.lastName, "last name"));
    safeSetText('#ccNickname', getSafeValue(profile?.nickname, "nickname"));
    
    // Slug can be at top level or in profile; prioritized by standard use case
    const displaySlug = profile?.slug || privateSlug;
    safeSetText('#ccSlug', getSafeValue(displaySlug, "slug"));
    
    safeSetText('#ccLoginEmail', getSafeValue(loginEmail, "login email"));
    safeSetText('#ccStatus', getSafeValue(status, "status"));
    safeSetText('#ccLanguage', getSafeValue(language, "language"));

    // --- 2. Date Fix: Strict Object Validation ---
    // Solves: "toLocaleDateString is not a function"
    let formattedDate = null;
    if (lastLoginDate instanceof Date && !isNaN(lastLoginDate.getTime())) {
        formattedDate = lastLoginDate.toLocaleDateString();
    }
    safeSetText('#ccLastLoginDate', getSafeValue(formattedDate, "last login date"));

    // --- 3. Arrays & Contact Info ---
    const phones = contactDetails?.phones || [];
    safeSetText('#ccPhones', getSafeValue(phones.join(', '), "phone numbers"));
    safeSetText('#ccMainPhone', getSafeValue(phones[0] || contactDetails?.mainPhone, "main phone"));

    // --- 4. Custom Fields (Table-defined Slugs) ---
    const website = customFields['custom_website-url-qfaybsowbhcaceafwphqxbe']?.value;
    const description = customFields['custom_company-description-ymeosslafzwyfus']?.value;
    const company = customFields['customfields_contact_company']?.value;

    safeSetText('#ccWebsiteUrl', getSafeValue(website, "website URL"));
    safeSetText('#ccCompanyDescription', getSafeValue(description, "company description"));
    safeSetText('#ccCompany', getSafeValue(company, "company"));

    // --- 5. Images ---
    safeSetImage('#ccProfilePhoto', profile?.profilePhoto?.url, DEFAULT_AVATAR);
    safeSetImage('#ccCoverPhoto', profile?.coverPhoto?.url, DEFAULT_AVATAR);
}

/**
 * Standardized UI Helpers
 */
function bootUI() {
    safeHide('#ccGeneralError');
    // Hide loading states if applicable
}

function safeSetText(selector, value) {
    const el = $w(selector);
    if (el && typeof el.text !== 'undefined') {
        el.text = value;
    } else {
        console.warn(`[cc-v2.0.4] Element ${selector} not found.`);
    }
}

function safeSetImage(selector, src, fallback) {
    const el = $w(selector);
    if (el && typeof el.src !== 'undefined') {
        el.src = src || fallback;
    }
}

function safeHide(selector) {
    const el = $w(selector);
    if (el && typeof el.hide === 'function') el.hide();
}

function showError(message) {
    const errEl = $w('#ccGeneralError');
    if (errEl) {
        errEl.text = message; // Never expose raw technical errors
        if (typeof errEl.expand === 'function') errEl.expand();
    }
}