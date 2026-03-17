/**
 * DEV MODE | PAGE CODE: Display Member Data
 * Displays both standard and custom member data
 * Refactored to Wix Velo Development Standards
 * v.1.2.3
 */

import wixLocation from 'wix-location';
import wixData from 'wix-data';
import { authentication, currentMember } from 'wix-members-frontend';
import { getSubscriberPlans } from 'backend/pricingplans.web';
import wixWindow from 'wix-window';

// --- Constants (Standard 3.0) ---
const VERSION = '[cc-v1.2.6]';
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

    // 2. Check Authentication
    if (!authentication.loggedIn()) {
        console.warn(`${VERSION} User not logged in. Redirecting...`);
        return wixLocation.to('/login');
    }

    try {
        // 3. Verify Membership (Standard 4.6 Dynamic Loading)
        _plansCache = await getSubscriberPlans();
        
        // Standard 4.10: Handle Preview Mode limitations
        if (wixWindow.viewMode === "Preview" && (!_plansCache || _plansCache.length === 0)) {
            console.warn(`${VERSION} API returned 0 plans. NOTE: listCurrentMemberOrders often returns [] in Preview.`);
        }

        if (!_plansCache || _plansCache.length === 0) {
            handleError(ERROR_MEMBERSHIP);
            return;
        }

        // 4. Load Data (Standard 4.2 State Management)
        _memberCache = await currentMember.getMember();
        
        if (_memberCache) {
            renderMemberDetails(_memberCache);
            await loadFullData(_memberCache._id);
        }

    } catch (error) {
        console.error(`${VERSION} Initialization Error:`, error);
        handleError(ERROR_OFFLINE);
    } finally {
        safeHide('#loadingIndicator');
    }
});

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
 * Standard 4.3: Safe UI Manipulation Helpers
 */
function safeSetText(selector, value) {
    const el = $w(selector);
    if (el && typeof el.text !== 'undefined') {
        el.text = value || "";
    }
}

function safeShow(selector) {
    const el = $w(selector);
    if (el) el.show();
}

function safeHide(selector) {
    const el = $w(selector);
    if (el) el.hide();
}

/**
 * Standard 4.4: Renders standard member information
 */
function renderMemberDetails(member) {
    try {
        safeSetText('#firstName', member.contactDetails?.firstName);
        safeSetText('#lastName', member.contactDetails?.lastName);
        safeSetText('#nickname', member.profile?.nickname || member.loginEmail);

        const profilePhotoUrl = member.profile?.photo?.url;
        const photoEl = $w('#profilePhoto');
        if (photoEl) {
            photoEl.src = profilePhotoUrl || DEFAULT_PROFILE_PHOTO;
        }
    } catch (err) {
        console.error(`${VERSION} Render Error:`, err);
    }
}

/**
 * Standard 4.6: Loads custom fields from 'FullData'
 */
async function loadFullData(memberId) {
    try {
        const result = await wixData.query('FullData')
            .eq('memberId', memberId)
            .limit(1)
            .find();

        if (result.items.length > 0) {
            const data = result.items[0];

            safeSetText('#company', data.companyName);
            
            // Handle Rich Text/HTML Links (Standard 4.3)
            const website = data.custom_websiteUrl || '';
            const webEl = $w('#websiteUrl');
            if (webEl) {
                webEl.text = website;
                if (website) {
                    webEl.html = `<p><a href="${website}" target="_blank">${website}</a></p>`;
                }
            }

            const coverEl = $w('#coverPhoto');
            if (coverEl) {
                coverEl.src = data.coverPhoto || DEFAULT_COVER_PHOTO;
            }
        }
    } catch (err) {
        console.error(`${VERSION} FullData Query Failed:`, err);
    }
}

function resetCustomFields() {
    safeSetText('#company', '');
    safeSetText('#websiteUrl', '');
    safeSetText('#companyDescription', '');
    const coverEl = $w('#coverPhoto');
    if (coverEl) coverEl.src = DEFAULT_COVER_PHOTO;
}

/**
 * Standard 4.10: Debug Exports
 */
export function debugState() {
    console.log(`${VERSION} DEBUG STATE:`, {
        member: _memberCache,
        plans: _plansCache,
        viewMode: wixWindow.viewMode
    });
}
