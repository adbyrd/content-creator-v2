/**
 * DISPLAY MEMBER DATA
 * Displays both FullData and PrivateMemberData collections
 * v.2.0.2
 */

import { currentMember } from 'wix-members-frontend';

// Standardized constants for user-facing messages
const MSG_LOAD_ERROR = "An unexpected error occurred while loading your profile.";
const MSG_NOT_LOGGED_IN = "Please log in to view your account details.";
const NO_DATA_SUFFIX = "on file.";

$w.onReady(async function () {
    console.log('[cc-v.2.0.2] Initializing Profile Page...'); // Standardized logging 
    
    try {
        // Bootstrap UI: ensure error elements are hidden initially
        safeHide('#ccGeneralError');
        
        const member = await currentMember.getMember({ fieldsets: ['FULL'] });

        if (member) {
            hydrateProfile(member);
        } else {
            console.warn('[cc-v.2.0.2] hydrateProfile: No active session.');
            showError(MSG_NOT_LOGGED_IN);
        }
    } catch (err) {
        console.error('[cc-v.2.0.2] Global initialization failure:', err);
        showError(MSG_LOAD_ERROR);
    }
});

/**
 * Maps the member object to UI elements with fallback logic
 * @param {import('wix-members-frontend').Member} member 
 */
function hydrateProfile(member) {
    const { contactDetails, profile, loginEmail, status, lastLoginDate, language } = member;
    const customFields = contactDetails?.customFields || {};

    // Internal helper for localized placeholder logic
    const getSafeValue = (val, label) => (val && val !== "") ? val : `There is no ${label} ${NO_DATA_SUFFIX}`;

    // --- 1. PrivateMemberData & Core Identity ---
    // ccName: Concatenate first and last or fallback to nickname
    const fullName = (contactDetails?.firstName || contactDetails?.lastName) 
        ? `${contactDetails.firstName || ''} ${contactDetails.lastName || ''}`.trim() 
        : profile?.nickname;
    
    safeSetText('#ccName', getSafeValue(fullName, "name"));
    safeSetText('#ccFirstName', getSafeValue(contactDetails?.firstName, "first name"));
    safeSetText('#ccLastName', getSafeValue(contactDetails?.lastName, "last name"));
    safeSetText('#ccNickname', getSafeValue(profile?.nickname, "nickname"));
    safeSetText('#ccSlug', getSafeValue(profile?.slug, "slug"));
    safeSetText('#ccLoginEmail', getSafeValue(loginEmail, "login email"));
    safeSetText('#ccStatus', getSafeValue(status, "status"));
    safeSetText('#ccLanguage', getSafeValue(language, "language"));

    // --- 2. Dates & Arrays (Requiring Formatting) ---
    const formattedDate = lastLoginDate ? lastLoginDate.toLocaleDateString() : null;
    safeSetText('#ccLastLoginDate', getSafeValue(formattedDate, "last login date"));

    const phones = contactDetails?.phones || [];
    safeSetText('#ccPhones', getSafeValue(phones.join(', '), "phone numbers"));
    safeSetText('#ccMainPhone', getSafeValue(phones[0], "main phone"));

    // --- 3. FullData / Custom Fields (using Table Slugs) ---
    const website = customFields['custom_website-url-qfaybsowbhcaceafwphqxbe']?.value;
    const description = customFields['custom_company-description-ymeosslafzwyfus']?.value;
    const company = customFields['customfields_contact_company']?.value;

    safeSetText('#ccWebsiteUrl', getSafeValue(website, "website URL"));
    safeSetText('#ccCompanyDescription', getSafeValue(description, "company description"));
    safeSetText('#ccCompany', getSafeValue(company, "company"));

    // --- 4. Images ---
    const DEFAULT_AVATAR = "https://static.wixstatic.com/media/ae928a_07a0f622d9924c528659556114e91851~mv2.png";
    safeSetImage('#ccProfilePhoto', profile?.profilePhoto?.url, DEFAULT_AVATAR);
    safeSetImage('#ccCoverPhoto', profile?.coverPhoto?.url, DEFAULT_AVATAR);
    safeSetImage('#ccPicture', member.picture, DEFAULT_AVATAR); // Private picture field
}

/**
 * Safe UI Manipulation Helpers
 */
function safeSetText(selector, value) {
    const el = $w(selector);
    if (el && typeof el.text !== 'undefined') {
        el.text = value;
    } else {
        console.warn(`[cc-v.2.0.2] safeSetText: Element ${selector} not found.`);
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

/**
 * Displays error messages to users
 */
function showError(message) {
    const errEl = $w('#ccGeneralError');
    if (errEl) {
        errEl.text = message;
        if (typeof errEl.expand === 'function') errEl.expand();
    }
}