/**
 * DISPLAY MEMBER DATA
 * Displays both FullData and PrivateMemberData collections
 * 
 * @version 2.0.8 (STABLE)
 * @updated 2026-03-18
 * 
 * DEBUG MODE: Added full customFields inspection so we can see the EXACT keys
 * returned by the API. This will confirm the real Field Keys and whether
 * the fields are missing because they aren't enabled in "Customize Profile Fields".
 */

import { currentMember } from 'wix-members-frontend';
import wixLocation from 'wix-location';
import wixData from 'wix-data';   // Added for PrivateMembersData fallback

// User-facing constants per Standards
const MSG_LOAD_ERROR = "An unexpected error occurred while loading your profile.";
const MSG_NOT_LOGGED_IN = "Please log in to view your account details.";
const MSG_NOT_A_MEMBER = "Your membership record was not found. Please re-register to continue.";
const NO_DATA_SUFFIX = "on file.";

// Custom Brand Assets
const DEFAULT_AVATAR = "https://static.wixstatic.com/media/155164_1f5df41ae90741139acb1148f2b4f864~mv2.png";
const DEFAULT_COVER = "https://static.wixstatic.com/media/155164_7b50fe484f8b47c0997728adc0ad9677~mv2.png";

$w.onReady(async function () {
    console.log('[cc-v2.0.9] Initializing Profile Page...'); // Standardized logging
    
    try {
        bootUI(); // Standard bootstrap
        
        // Defensive check for member existence to prevent 404 crash
        const member = await currentMember.getMember({ fieldsets: ['FULL'] })
            .catch(err => {
                console.error('[cc-v2.0.9] Member fetch failed (404 expected for deleted users):', err);
                return null; 
            });

        if (member) {
            await hydrateProfile(member);   // Now async for PrivateMembersData fallback
        } else {
            console.warn('[cc-v2.0.9] No member record found for this account.');
            showError(MSG_NOT_A_MEMBER);
            // Optional: Redirect to registration after delay
            // setTimeout(() => wixLocation.to("/register"), 5000);
        }
    } catch (err) {
        console.error('[cc-v2.0.9] Global initialization failure:', err); 
        showError(MSG_LOAD_ERROR);
    }
});

/**
 * Maps the member object to UI elements using safe manipulation
 * (now async to support PrivateMembersData fallback)
 */
async function hydrateProfile(member) {
    const { contactDetails, profile, loginEmail, status, lastLoginDate, language, _id: memberId } = member;
    const profileCustomFields = contactDetails?.customFields || {};

    // === ENHANCED CUSTOM FIELDS (Profile + PrivateMembersData fallback) ===
    // This fixes the exact issue: fields saved in system but not appearing in contactDetails.customFields
    let customFields = { ...profileCustomFields };

    try {
        const queryResult = await wixData.query("PrivateMembersData")
            .eq("_id", memberId)          // _id matches member._id in PrivateMembersData
            .limit(1)
            .find();

        if (queryResult.items.length > 0) {
            const privateData = queryResult.items[0];
            console.log('[cc-v2.0.9] Merged custom fields from PrivateMembersData collection');
            // Merge: private fields are flat (direct values), profile fields may be nested
            customFields = { ...customFields, ...privateData };
        } else {
            console.log('[cc-v2.0.9] No PrivateMembersData record found – using profile fields only');
        }
    } catch (err) {
        console.warn('[cc-v2.0.9] PrivateMembersData fallback skipped (permissions or collection issue):', err.message);
        // Graceful – continue with profile fields only
    }

    const getSafeValue = (val, label) => (val && val !== "") ? val : `There is no ${label} ${NO_DATA_SUFFIX}`;

    // --- 1. Identity & Contact ---
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

    // --- 2. Date Fix: Instance check to avoid toLocaleDateString crash  ---
    let formattedDate = null;
    if (lastLoginDate instanceof Date && !isNaN(lastLoginDate.getTime())) {
        formattedDate = lastLoginDate.toLocaleDateString();
    }
    safeSetText('#ccLastLoginDate', getSafeValue(formattedDate, "last login date"));

    // --- 3. Phone Array Normalization ---
    const phones = contactDetails?.phones || [];
    safeSetText('#ccPhones', getSafeValue(phones.join(', '), "phone numbers"));
    safeSetText('#ccMainPhone', getSafeValue(phones[0], "main phone"));

    // --- 4. Custom Fields (now guaranteed to load from either source) ---
    const website = getCustomFieldValue(customFields, 'custom_website-url-qfaybsowbhcaceafwphqxbe');
    const description = getCustomFieldValue(customFields, 'custom_company-description-ymeosslafzwyfus');
    const company = getCustomFieldValue(customFields, 'customfields_contact_company');

    safeSetText('#ccWebsiteUrl', getSafeValue(website, "website URL"));
    safeSetText('#ccCompanyDescription', getSafeValue(description, "company description"));
    safeSetText('#ccCompany', getSafeValue(company, "company"));

    // --- 5. Image Hydration with Custom Brand Defaults ---
    safeSetImage('#ccProfilePhoto', profile?.profilePhoto?.url, DEFAULT_AVATAR);
    safeSetImage('#ccCoverPhoto', profile?.coverPhoto?.url, DEFAULT_COVER);
}

/**
 * Safely extracts a custom field value (handles both nested {value} and flat PrivateMembersData values)
 */
function getCustomFieldValue(customFields, key) {
    const entry = customFields?.[key];
    if (entry == null) {
        console.warn(`[cc-v2.0.9] Custom field "${key}" not found in merged data.`);
        return null;
    }
    if (typeof entry === 'object' && entry !== null && 'value' in entry) {
        console.log(`[cc-v2.0.9] Custom field "${key}" loaded (nested value):`, entry.value);
        return entry.value;
    }
    console.log(`[cc-v2.0.9] Custom field "${key}" loaded (direct value):`, entry);
    return entry;
}

/**
 * Standardized UI Helpers (Safe Manipulation) – unchanged
 */
function bootUI() {
    safeHide('#ccGeneralError');
}

function safeSetText(selector, value) {
    const el = $w(selector);
    if (el && typeof el.text !== 'undefined') {
        el.text = value;
    } else {
        console.warn(`[cc-v2.0.9] safeSetText: Element ${selector} not found.`);
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
 * Displays user-centric error messages – unchanged
 */
function showError(message) {
    const errEl = $w('#ccGeneralError');
    if (errEl) {
        errEl.text = message; 
        if (typeof errEl.expand === 'function') errEl.expand();
    }
}