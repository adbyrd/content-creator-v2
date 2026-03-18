/**
 * DISPLAY MEMBER DATA
 * Displays both standard and custom member data
 * v.2.0.1
 */

import { currentMember } from 'wix-members-frontend';

// Standardized constants for user-facing messages [cite: 151]
const MSG_NOT_LOGGED_IN = "You must be logged in to view your profile data.";
const NO_DATA_STR = "on file."; 

$w.onReady(async function () {
    console.log('[cc-v.2.0.1] Initializing Member Profile Page...');
    
    try {
        const member = await currentMember.getMember({ fieldsets: ['FULL'] });

        if (member) {
            hydrateProfile(member);
        } else {
            console.warn('[cc-v.2.0.1] No active session found.');
            showError(MSG_NOT_LOGGED_IN);
        }
    } catch (err) {
        console.error('[cc-v.2.0.1] Profile hydration failed:', err);
        showError("An unexpected error occurred while loading your data.");
    }
});

/**
 * Hydrates UI elements using safe manipulation and standard placeholders [cite: 10, 46, 68]
 */
function hydrateProfile(member) {
    const { contactDetails, profile } = member;
    const customFields = contactDetails.customFields || {};

    // Standardized Helper: Returns the value or a structured "no data" fallback [cite: 10, 138]
    const getSafeValue = (val, label) => (val && val !== "") ? val : `There is no ${label} ${NO_DATA_STR}`;

    // 1. PrivateMemberData Mapping
    safeSetText('#ccFirstName', getSafeValue(contactDetails.firstName, "first name"));
    safeSetText('#ccLastName', getSafeValue(contactDetails.lastName, "last name"));
    safeSetText('#ccNickname', getSafeValue(profile.nickname, "nickname"));
    safeSetText('#ccLoginEmail', getSafeValue(member.loginEmail, "login email"));
    safeSetText('#ccStatus', getSafeValue(member.status, "account status"));
    
    // 2. FullData / Custom Fields 
    const website = customFields['custom_website-url-qfaybsowbhcaceafwphqxbe']?.value;
    const description = customFields['custom_company-description-ymeosslafzwyfus']?.value;
    const company = customFields['customfields_contact_company']?.value;

    safeSetText('#ccWebsiteUrl', getSafeValue(website, "website URL"));
    safeSetText('#ccCompanyDescription', getSafeValue(description, "company description"));
    safeSetText('#ccCompany', getSafeValue(company, "company name"));

    // 3. Image Hydration [cite: 68]
    const DEFAULT_AVATAR = "https://static.wixstatic.com/media/ae928a_07a0f622d9924c528659556114e91851~mv2.png";
    safeSetImage('#ccProfilePhoto', profile.profilePhoto?.url, DEFAULT_AVATAR);
}

/**
 * Safe UI Helper: Ensures element exists before setting text [cite: 46, 47]
 */
function safeSetText(selector, value) {
    const el = $w(selector);
    if (el && typeof el.text !== 'undefined') {
        el.text = value;
    } else {
        console.warn(`[cc-v.2.0.1] Element ${selector} not found on page.`);
    }
}

/**
 * Safe UI Helper: Ensures element exists before setting source 
 */
function safeSetImage(selector, src, fallback) {
    const el = $w(selector);
    if (el && typeof el.src !== 'undefined') {
        el.src = src || fallback;
    }
}

/**
 * Centralized Error Display [cite: 152]
 */
function showError(message) {
    safeSetText('#ccGeneralError', message);
    $w('#ccGeneralError').expand();
}