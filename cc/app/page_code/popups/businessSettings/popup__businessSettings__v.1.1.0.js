/**
 * LIGHTBOX: Business Settings Popup
 * @version 1.1.0
 */

import wixWindowFrontend from 'wix-window-frontend';
import { getTaxonomy } from 'backend/categoryService.web';
import { saveMemberBusinessProfile } from 'backend/memberData.web';

const CUSTOMER_BASE_OPTIONS = [
    { label: 'Select your customer base...', value: '', disabled: true },
    { label: 'B2C (Business-to-Consumer)', value: 'b2c-business-to-consumer' },
    { label: 'B2B (Business-to-Business)', value: 'b2b-business-to-business' },
    { label: 'B2B2C (Business-to-Business-to-Consumer)', value: 'b2b2c-business-to-business-to-consumer' },
    { label: 'B2G / Government', value: 'b2g-government' },
    { label: 'Non-Profit / NGO / Charities', value: 'non-profit-ngo-charities' },
    { label: 'Internal / Employees', value: 'internal-employees' },
    { label: 'Mixed / Hybrid (B2B & B2C)', value: 'mixed-hybrid-b2b-b2c' }
];

let _taxonomy = null;

$w.onReady(async function () {
    const context = wixWindowFrontend.lightbox.getContext(); // Receive existing data
    bootUI(context);

    // Load Taxonomy
    _taxonomy = await getTaxonomy();
    if (_taxonomy) {
        $w('#ccBusinessCategory').options = [{ label: 'Select...', value: '', disabled: true }, ..._taxonomy.parentOptions];
        if (context?.businessCategory) {
            $w('#ccBusinessCategory').value = context.businessCategory;
            updateSubCategory(context.businessCategory, context.businessSubCategory);
        }
    }

    // Handlers
    $w('#ccBusinessCategory').onChange((e) => updateSubCategory(e.target.value));
    
    $w('#btnCancel').onClick(() => wixWindowFrontend.lightbox.close(false));

    $w('#btnSave').onClick(async () => {
        if (validate()) {
            $w('#btnSave').disable();
            const payload = {
                businessCategory: $w('#ccBusinessCategory').value,
                businessSubCategory: $w('#ccBusinessSubCategory').value,
                customerType: $w('#ccCustomerBase').value
            };
            await saveMemberBusinessProfile(payload);
            wixWindowFrontend.lightbox.close(true); // Return true to signal success
        }
    });
});

function updateSubCategory(parentSlug, existingSub = '') {
    const children = _taxonomy?.childrenByParent[parentSlug] || [];
    $w('#ccBusinessSubCategory').options = [{ label: 'Select...', value: '', disabled: true }, ...children];
    $w('#ccBusinessSubCategory').value = existingSub;
    $w('#ccBusinessSubCategory').enable();
}

function bootUI(context) {
    $w('#ccCustomerBase').options = CUSTOMER_BASE_OPTIONS;
    if (context?.customerType) $w('#ccCustomerBase').value = context.customerType;
}

function validate() {
    return $w('#ccBusinessCategory').valid && $w('#ccBusinessSubCategory').valid && $w('#ccCustomerBase').valid;
}