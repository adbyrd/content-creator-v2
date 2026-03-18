/**
 * DISPLAY MEMBER DATA
 * Displays both FullData and PrivateMemberData collections
 * @version 2.0.5
 * @updated 2026-03-18
 */

/** * [cc-v2.0.5] Member Profile Data Display
 * Standards-compliant hydration with custom brand default assets.
 * Resolves Date type-safety and toLocaleDateString compatibility.
 */
import { currentMember } from 'wix-members-frontend';

// Standardized constants for user-facing messages
const MSG_LOAD_ERROR = "An unexpected error occurred while loading your profile.";
const MSG_NOT_LOGGED_IN = "Please log in to view your account details.";
const NO_DATA_SUFFIX = "on file.";

// Custom Brand Assets
const DEFAULT_AVATAR = "https://static.wixstatic.com/media/155164_1f5df41ae90741139acb1148f2b4f864~mv2.png";
const DEFAULT_COVER = "https://static.wixstatic.com/media/155164_7b50fe484f8b47c0997728adc0ad9677~mv2.png";

$w.onReady(async function () {
    console.log('[cc-v2.0.5] Initializing Profile Page...'); // Standardized logging
    
    try {
        bootUI(); // Standard initialization sequence
        
        const member = await currentMember.getMember({ fieldsets: ['FULL'] });

        if (member) {
            hydrateProfile(member);
        } else {
            console.warn('[cc-v2.0.5] hydrateProfile: No active session.');
            showError(MSG_NOT_LOGGED_IN);
        }
    } catch (err) {
        console.error('[cc-v2.0.5] Global initialization failure:', err); 
        showError(MSG_LOAD_ERROR);
    }
});

/**
 * Maps the member object to UI elements using safe manipulation helpers
 */
function hydrateProfile(member) {
    const { contactDetails, profile, loginEmail, status, lastLoginDate, language } = member;
    const customFields = contactDetails?.customFields || {};

    // Standardized Helper: Returns value or structured "no data" fallback
    const getSafeValue = (val, label) => (val && val !== "") ? val : `There is no ${label} ${NO_DATA_SUFFIX}`;

    // --- 1. Core Identity & Contact ---
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

    // --- 2. Date Fix: Robust Type Guarding ---
    // Prevents "toLocaleDateString is not a function" by verifying object type 
    let formattedDate = null;
    if (lastLoginDate instanceof Date && !isNaN(lastLoginDate.getTime())) {
        formattedDate = lastLoginDate.toLocaleDateString();
    }
    safeSetText('#ccLastLoginDate', getSafeValue(formattedDate, "last login date"));

    // --- 3. Phone Array Normalization ---
    const phones = contactDetails?.phones || [];
    safeSetText('#ccPhones', getSafeValue(phones.join(', '), "phone numbers"));
    safeSetText('#ccMainPhone', getSafeValue(phones[0], "main phone"));

    // --- 4. Custom Fields (Table-defined Slugs) ---
    const website = customFields['custom_website-url-qfaybsowbhcaceafwphqxbe']?.value;
    const description = customFields['custom_company-description-ymeosslafzwyfus']?.value;
    const company = customFields['customfields_contact_company']?.value;

    safeSetText('#ccWebsiteUrl', getSafeValue(website, "website URL"));
    safeSetText('#ccCompanyDescription', getSafeValue(description, "company description"));
    safeSetText('#ccCompany', getSafeValue(company, "company"));

    // --- 5. Image Hydration with Custom Defaults ---
    safeSetImage('#ccProfilePhoto', profile?.profilePhoto?.url, DEFAULT_AVATAR);
    safeSetImage('#ccCoverPhoto', profile?.coverPhoto?.url, DEFAULT_COVER);
}

/**
 * Standardized UI Helpers for Defensive Programming
 */
function bootUI() {
    safeHide('#ccGeneralError');
}

function safeSetText(selector, value) {
    const el = $w(selector);
    if (el && typeof el.text !== 'undefined') {
        el.text = value;
    } else {
        console.warn(`[cc-v2.0.5] Element ${selector} not found.`);
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
        errEl.text = message; 
        if (typeof errEl.expand === 'function') errEl.expand();
    }
}