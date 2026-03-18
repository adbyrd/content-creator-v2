/**
 * DEV MODE | PAGE CODE: Display Member Data
 * Displays both standard and custom member data
 * Refactored to Wix Velo Development Standards
 * v.1.2.5
 */
import wixLocation from 'wix-location';
import wixData from 'wix-data';
import { authentication, currentMember } from 'wix-members-frontend';
import { getSubscriberPlans } from 'backend/pricingplans.web';
import wixWindow from 'wix-window';

// --- Constants (Standard 3.0) ---
const VERSION = '[cc-v1.2.5]';
const ERROR_MEMBERSHIP = 'No active membership found. Please upgrade to view this page.';
const ERROR_OFFLINE = 'Unable to verify membership. Please try again later.';
const DEFAULT_PROFILE_PHOTO = 'default-profile.png';
const DEFAULT_COVER_PHOTO = 'default-cover.jpg';

// --- Module-Level State (Standard 4.2) ---
let _memberCache = null;
let _plansCache = [];

$w.onReady(async function () {
    console.log(`${VERSION} Initializing Page...`);
    
    // 1. Standard 4.1: Bootstrap UI
    bootUI();

    // 2. Authentication Check
    if (!authentication.loggedIn()) {
        console.warn(`${VERSION} User not logged in. Redirecting to /login.`);
        return wixLocation.to('/login');
    }

    try {
        // 3. Standard 4.10: Handle Preview Mode limitations
        if (wixWindow.viewMode === "Preview") {
            console.warn(`${VERSION} NOTE: Pricing Plans API returns [] in Preview. Test on LIVE site.`);
        }

        // 4. Verify Membership (Standard 4.6 Dynamic Loading)
        _plansCache = await getSubscriberPlans();
        
        if (!_plansCache || _plansCache.length === 0) {
            handleError(ERROR_MEMBERSHIP);
            return;
        }

        // 5. Load Data (Standard 4.2 State Management)
        _memberCache = await currentMember.getMember();
        
        if (_memberCache) {
            renderMemberDetails(_memberCache);
            await loadccFullData(_memberCache._id);
        }

    } catch (error) {
        console.error(`${VERSION} Initialization Error:`, error);
        handleError(ERROR_OFFLINE);
    } finally {
        safeHide('#loadingIndicator');
    }
});

/**
 * Standard 4.3: Robust Safe UI Manipulation Helpers
 * Fixes "TypeError: el.show is not a function" by checking capability
 */
function safeShow(selector) {
    const el = $w(selector);
    if (el && typeof el.show === 'function') {
        el.show();
    }
}

function safeHide(selector) {
    const el = $w(selector);
    if (el && typeof el.hide === 'function') {
        el.hide();
    }
}

function safeSetText(selector, value) {
    const el = $w(selector);
    if (el && typeof el.text !== 'undefined') {
        el.text = value || "";
    }
}

/**
 * Standard 4.1: Initialization & UI Reset
 */
function bootUI() {
    safeShow('#loadingIndicator');
    safeHide('#errorMessage');
    resetCustomFields();
}

/**
 * Standard 7.0: User Communication
 */
function handleError(message) {
    safeSetText('#errorMessage', message);
    safeShow('#errorMessage');
    safeHide('#loadingIndicator');
}

/**
 * Standard 4.4: Renders standard member information
 * Updated Tuesday, March 17th, 2026
 */
function renderMemberDetails(member) {
   try {
       safeSetText('#firstName', member.contactDetails?.firstName);
       safeSetText('#lastName', member.contactDetails?.lastName);
       safeSetText('#nickname', member.profile?.nickname || member.loginEmail);

       const photoEl = $w('#profilePhoto');
       if (photoEl && typeof photoEl.src !== 'undefined') {
           // Ensure we have a valid URL string, not an object or the word "src"
           const profilePhotoUrl = member.profile?.photo?.url;
           photoEl.src = (profilePhotoUrl && profilePhotoUrl.includes('://')) 
                         ? profilePhotoUrl 
                         : DEFAULT_PROFILE_PHOTO;
       }
   } catch (err) {
       console.error(`${VERSION} Render Error:`, err);
   }
}

/**
 * Standard 4.6: Loads custom fields from 'ccFullData'
 * Updated Tuesday, March 17th, 2026
 * Loads and renders custom fields from 'ccFullData'. Includes fallback logic for null/missing values.
 */
async function loadccFullData(memberId) {
    try {
        const result = await wixData.query('ccFullData')
            .eq('memberId', memberId)
            .limit(1)
            .find();

        if (result.items.length > 0) {
            const data = result.items[0];

            // 1. Company Name & Description (Standard 6.2 Fallbacks)
            safeSetText('#company', data.companyName || "No Company Name on file");
            safeSetText('#companyDescription', data.companyDescription || "No Company Description On File");

            // 2. Address/Zip Code Logic (Standard 4.3 Safe Manipulation)
            // Assuming zip is stored in a 'zipCode' field or nested address object
            const zipCode = data.zipCode || data.address?.postalCode || "No Zip Code On File";
            safeSetText('#zipCode', zipCode);

            // 3. Website URL (Standard 4.3)
            const website = data.custom_websiteUrl || '';
            const webEl = $w('#websiteUrl');
            if (webEl && typeof webEl.html !== 'undefined') {
                if (website) {
                    webEl.html = `<p><a href="${website}" target="_blank">${website}</a></p>`;
                } else {
                    webEl.text = "No Website URL On File";
                }
            }

            // 4. Cover Photo
            const coverEl = $w('#coverPhoto');
            if (coverEl && typeof coverEl.src !== 'undefined') {
                coverEl.src = data.coverPhoto || DEFAULT_COVER_PHOTO;
            }
            
            console.log(`${VERSION} ccFullData successfully loaded for member: ${memberId}`);
        } else {
            console.warn(`${VERSION} No records found in ccFullData for member: ${memberId}`);
            setEmptyStateMessages();
        }
    } catch (err) {
        console.error(`${VERSION} ccFullData Query Failed:`, err);
        // Standard 7.0: Use central error handler for technical failures
        handleError("We encountered an issue loading your profile details.");
    }
}

function resetCustomFields() {
    safeSetText('#company', '');
    safeSetText('#websiteUrl', '');
    safeSetText('#companyDescription', '');
    const coverEl = $w('#coverPhoto');
    if (coverEl && typeof coverEl.src !== 'undefined') {
        coverEl.src = DEFAULT_COVER_PHOTO;
    }
}

/**
 * Standard 4.10: Debug Export
 * Call this from the browser console to inspect current state
 */
export function debugMemberState() {
    console.log(`${VERSION} Current State:`, {
        member: _memberCache,
        plans: _plansCache,
        viewMode: wixWindow.viewMode
    });
}

/**
 * Helper to set default messages when no database record exists
 */
function setEmptyStateMessages() {
    safeSetText('#company', "No Company Name On File");
    safeSetText('#companyDescription', "No Company Description On File");
    safeSetText('#zipCode', "No Zip Code On File");
    safeSetText('#websiteUrl', "No Website URL On File");
}