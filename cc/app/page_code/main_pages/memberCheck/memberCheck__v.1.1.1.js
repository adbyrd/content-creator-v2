/**
 * MEMBER CHECK
 * @version 1.1.1
 * @updated 2026-03-24
 */

import wixLocation from 'wix-location';
import { checkMemberExists } from 'backend/memberFunctions.web';

// Standards: Versioning and User-facing messages as constants [cite: 29, 151, 162]
const VERSION = '[cc-v1.1.2]';
const MSG_ERROR_GENERIC = 'Technical error encountered. Please try again later.';

$w.onReady(function () {
    bootUI(); // Standards: [cite: 36]
    wireEventHandlers(); // Standards: [cite: 38]
});

/**
 * Standards: 4.1 Initialization
 * Sets initial state of UI elements[cite: 36].
 */
function bootUI() {
    safeCollapse("#ccPreCheck");
}

/**
 * Standards: 4.1 Initialization
 * Attaches logic to UI elements[cite: 38].
 */
function wireEventHandlers() {
    $w("#ccMemberCheck").onClick(async () => {
        await handleMemberCheck();
    });
}

/**
 * Standards: 4.8 Form Submission Pattern
 * Handles the core business logic for the member check[cite: 82].
 */
async function handleMemberCheck() {
    const email = $w("#ccMemberEmail").value;

    // Standards: 4.4 Validation [cite: 54]
    if (!email || !$w("#ccMemberEmail").valid) {
        $w("#ccMemberEmail").updateValidityIndication();
        return;
    }

    // Standards: 4.6 Dynamic Data Loading / UI Feedback [cite: 67]
    safeExpand("#ccPreCheck");
    safeDisable("#ccMemberCheck", true);

    try {
        console.log(`${VERSION} Requesting member check for redirection flow...`);
        
        // Destructure structured response from backend [cite: 118, 122]
        const { ok, exists, error } = await checkMemberExists(email);

        if (ok) {
            if (exists) {
                // Member found: Route to Profile (Auth screen will trigger naturally)
                wixLocation.to("/profile");
            } else {
                // Member not found: Route to Pricing
                wixLocation.to("/pricing-plans");
            }
        } else {
            // Standards: Handle structured backend errors [cite: 125]
            throw new Error(error?.message || 'Unknown Backend Error');
        }
    } catch (err) {
        // Standards: 3.0 Logging and User Communication [cite: 33, 156]
        console.error(`${VERSION} Flow Error:`, err);
        showUserError(MSG_ERROR_GENERIC);
        
        // Standards: Defensive programming fallback [cite: 10]
        wixLocation.to("/pricing-plans");
    }
}

/**
 * Standards: 4.3 Safe UI Manipulation Helpers
 * Prevents code breaks if elements are missing or in transition[cite: 46, 52].
 */
function safeDisable(selector, disabled = true) {
    const el = $w(selector);
    if (el && typeof el.disable === 'function') {
        disabled ? el.disable() : el.enable();
    }
}

function safeExpand(selector) {
    const el = $w(selector);
    if (el && typeof el.expand === 'function') el.expand();
}

function safeCollapse(selector) {
    const el = $w(selector);
    if (el && typeof el.collapse === 'function') el.collapse();
}

/**
 * Standards: 7.0 Error Messages
 * Centralized function to handle user-facing feedback[cite: 152].
 */
function showUserError(message) {
    console.warn(`${VERSION} User Error Displayed: ${message}`);
    // Optional: safeExpand("#ccErrorMsg"); safeSetText("#ccErrorMsg", message);
}