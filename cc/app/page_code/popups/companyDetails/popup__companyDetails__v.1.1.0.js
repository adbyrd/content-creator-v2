/**
 * LIGHTBOX: Company Details Popup
 * Handles Company Name, URL, Description, Zip Code, Email, and Phone.
 * @version 1.1.0
 */

import wixWindowFrontend from 'wix-window-frontend';

// Backend Service Import
import { saveMemberBusinessProfile } from 'backend/ccMembers.web';

$w.onReady(function () {
    console.log('[cc-popupCompany-v1.1.0] Initializing Company Details Editor...');

    // 1. Get existing data passed from the Profile Page context
    const context = wixWindowFrontend.lightbox.getContext();
    
    // 2. Pre-populate the form
    hydrateForm(context);

    // 3. Setup Event Handlers
    $w('#btnCancel').onClick(() => {
        wixWindowFrontend.lightbox.close(false);
    });

    $w('#btnSave').onClick(async () => {
        await handleSave();
    });
});

/**
 * Populates form fields with existing data from the ccMembers collection
 */
function hydrateForm(data) {
    if (!data) return;

    // Field names match the CSV/Schema provided (including specific typos like 'Comany')
    $w('#ccCompanyName').value = data.ccComanyName || "";
    $w('#ccCompanyURL').value = data.ccCompanyURL || "";
    $w('#ccCompanyDescription').value = data.ccComanyDescription || "";
    $w('#ccCompanyZipCode').value = data.ccComanyZipCode || "";
    
    // Issue 005: Custom Collection Email & Phone
    $w('#ccCompanyEmail').value = data.ccCompanyEmail || "";
    $w('#ccCompanyPhone').value = data.ccCompanyPhone || "";
}

/**
 * Validates and saves the updated company information
 */
async function handleSave() {
    if (!validateForm()) {
        return; // Validation UI is handled by Wix's native validation settings
    }

    // Standard UI Loading State
    $w('#btnSave').disable();
    $w('#btnSave').label = "Saving...";

    // Construct the payload matching the ccMembers collection schema
    const payload = {
        ccComanyName: $w('#ccCompanyName').value,
        ccCompanyURL: $w('#ccCompanyURL').value,
        ccComanyDescription: $w('#ccCompanyDescription').value,
        ccComanyZipCode: $w('#ccCompanyZipCode').value,
        ccCompanyEmail: $w('#ccCompanyEmail').value,
        ccCompanyPhone: $w('#ccCompanyPhone').value
    };

    try {
        /**
         * The backend saveMemberBusinessProfile (v1.2.0) performs a 
         * merge to ensure Business Settings (Category/Sub-Cat) are preserved.
         */
        await saveMemberBusinessProfile(payload);
        
        console.log('[cc-popupCompany-v1.1.0] Company details persisted successfully.');
        wixWindowFrontend.lightbox.close(true); // Return true to trigger page reload
        
    } catch (err) {
        console.error('[cc-popupCompany-v1.1.0] Save failed:', err);
        $w('#btnSave').enable();
        $w('#btnSave').label = "Save Changes";
        // Implementation note: You may add a toast message here for user feedback
    }
}

/**
 * Basic validation check for required fields
 */
function validateForm() {
    const requiredFields = ['#ccCompanyName', '#ccCompanyURL'];
    let allValid = true;

    requiredFields.forEach(selector => {
        if (!$w(selector).valid) {
            allValid = false;
        }
    });

    return allValid;
}