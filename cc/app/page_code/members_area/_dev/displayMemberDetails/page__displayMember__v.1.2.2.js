/**
 * DEV MODE | PAGE CODE: Display Member Data
 * Displays both standard and custom member data
 * Refactored to Wix Velo Development Standards
 * v.1.2.2
 */

import wixLocation from 'wix-location';
import wixData from 'wix-data';
import { authentication, currentMember } from 'wix-members-frontend';
import { getSubscriberPlans } from 'backend/pricingplans.web';

// --- Constants (Standard 3.0) ---
const VERSION = '[cc-v1.2.1]';
const ERROR_MEMBERSHIP = 'Unable to verify membership. Please try again later.';
const ERROR_MEMBER_DETAILS = 'Failed to load member details.';
const DEFAULT_PROFILE_PHOTO = 'default-profile.png';
const DEFAULT_COVER_PHOTO = 'default-cover.jpg';

// --- Module-Level State (Standard 4.2) ---
let _memberCache = null;
let _fullDataCache = null;

$w.onReady(async function () {
    console.log(`${VERSION} Initializing Page...`);
    
    // 1. Bootstrap UI & Check Auth
    if (!authentication.loggedIn()) {
        console.warn(`${VERSION} User not logged in, redirecting.`);
        return wixLocation.to('/login');
    }

    try {
        // 2. Resolve Wizard/Page States (Standard 4.1)
        bootUI();

        // 3. Verify Membership via Backend
        const plans = await getSubscriberPlans();
        
        if (!plans || plans.length === 0) {
            console.warn(`${VERSION} No active plans found.`);
            return wixLocation.to('/upgrade');
        }

        // 4. Load Data in Parallel (Standard 4.6)
        _memberCache = await currentMember.getMember();
        
        if (_memberCache) {
            renderMemberDetails(_memberCache);
            await loadFullData(_memberCache._id);
        }

    } catch (error) {
        console.error(`${VERSION} Initialization Error:`, error);
        safeSetText('#errorMessage', ERROR_MEMBERSHIP);
        safeShow('#errorMessage');
    } finally {
        safeHide('#loadingIndicator');
    }
});

/**
 * Standard 4.3: Safe UI Manipulation Helpers
 * Prevents script crashes if elements are missing from the DOM
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
 * Initialize UI States (Standard 4.1)
 */
function bootUI() {
    safeShow('#loadingIndicator');
    safeHide('#errorMessage');
    resetCustomFields();
}

/**
 * Renders standard member information (Standard 4.4)
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
        safeSetText('#errorMessage', ERROR_MEMBER_DETAILS);
    }
}

/**
 * Loads custom fields from 'FullData' (Standard 4.6)
 */
async function loadFullData(memberId) {
    try {
        const result = await wixData.query('FullData')
            .eq('memberId', memberId)
            .limit(1)
            .find();

        if (result.items.length > 0) {
            _fullDataCache = result.items[0];
            const data = _fullDataCache;

            safeSetText('#company', data.companyName);
            
            // Handle Rich Text/HTML Clickable Links (Standard 4.3 logic)
            const website = data.custom_websiteUrl || '';
            const webEl = $w('#websiteUrl');
            if (webEl) {
                webEl.text = website;
                if (website) {
                    webEl.html = `<p style="font-size:16px"><a href="${website}" target="_blank">${website}</a></p>`;
                }
            }

            const coverEl = $w('#coverPhoto');
            if (coverEl) {
                coverEl.src = data.coverPhoto || DEFAULT_COVER_PHOTO;
            }
        }
    } catch (err) {
        console.error(`${VERSION} FullData Query Failed:`, err);
        // Do not crash the page, just log (Defensive Programming)
    }
}

function resetCustomFields() {
    safeSetText('#company', '');
    safeSetText('#websiteUrl', '');
    safeSetText('#companyDescription', '');
    
    const coverEl = $w('#coverPhoto');
    if (coverEl) coverEl.src = DEFAULT_COVER_PHOTO;
}
