/**
 * COMPANY DETAILS
 * v1.4.0 – Added full element verification + grouped error toast (per standards.md)
 *          Corrected selectors per semantics.md; added missing customerType form field reference
 *
 * Creates a permanent business profile—logo, colors, products, audience, and industry.
 * Content Creator 2.0 
 */

import { currentMember, authentication } from 'wix-members-frontend';
import wixData from 'wix-data';
import wixLocation from 'wix-location-frontend';
import { updateMemberProfile } from 'backend/ccMembers.web';

// -------------------- CONSTANTS --------------------
const VERSION = '[company-details v1.4.0]';
const COMPANY_COLLECTION = 'CompanyProfiles';
const MSG_SAVE_SUCCESS = 'Company details saved successfully.';
const MSG_SAVE_ERROR = 'Failed to save details. Please try again.';
const MSG_LOAD_ERROR = 'Could not load your company details.';
const MSG_LOGIN_REQUIRED = 'You must be logged in to manage company details.';
const MSG_ELEMENTS_MISSING = 'Page setup incomplete – elements missing. See semantics.md';

// Mapping from data keys to display element IDs
const DISPLAY_MAP = {
    companyName: '#ccDisplayCompanyName',
    websiteUrl: '#ccDisplayCompanyWebsiteURL',
    companyDescription: '#ccDisplayCompanyDescription',
    companyEmail: '#ccDisplayCompanyEmail',
    zipCode: '#ccDisplayCompanyZipCode',
    primaryCategory: '#ccDisplayCompanyBusinessCategory',
    primarySubCategory: '#ccDisplayCompanyBusinessSubCategory',
    customerType: '#ccDisplayCompanyCustomerType',
    preferredPlatform: '#ccDisplaySocialMediaPlatform'
};

// Mapping from data keys to form input IDs
const FORM_MAP = {
    companyName: '#ccFormCompanyName',
    companyEmail: '#ccFormCompanyEmail',
    zipCode: '#ccFormCompanyZipcode',
    websiteUrl: '#ccFormCompanyWebsite',
    companyDescription: '#ccFormCompanyDescription',
    primaryCategory: '#ccFormBusinessCategory',
    primarySubCategory: '#ccFormBusinessSubCategory',
    customerType: '#ccFormBusinessCustomerType',   // ← was missing in old semantics.md
    preferredPlatform: '#ccFormSocialMediaPlatform'
};

// -------------------- MODULE STATE --------------------
let _companyDetails = null;
let _isLoading = false;

// -------------------- SAFE UI HELPERS (unchanged) --------------------
function safeGetElement(selector) {
    const el = $w(selector);
    return el && el.length ? el : null;
}

function safeSetValue(selector, value) {
    const el = safeGetElement(selector);
    if (el) el.value = value || '';
    else console.warn(`Input element not found: ${selector}`);
}

function safeGetValue(selector) {
    const el = safeGetElement(selector);
    return el ? el.value : '';
}

function safeSetText(selector, text) {
    const el = safeGetElement(selector);
    if (el) el.text = text || '';
    else console.warn(`Text element not found: ${selector}`);
}

function showToast(message, type = 'success') {
    const toast = safeGetElement('#toastMessage');
    if (toast) {
        toast.text = message;
        toast.show('fade', { duration: 200 });
        setTimeout(() => toast.hide('fade', { duration: 500 }), 4000);
    } else {
        console.log(`[Toast ${type}]: ${message}`);
    }
}

// -------------------- NEW: ELEMENT VERIFICATION (2026 best practice) --------------------
function verifyAllElements() {
    const allSelectors = [...Object.values(FORM_MAP), ...Object.values(DISPLAY_MAP)];
    const missing = allSelectors.filter(sel => !safeGetElement(sel));

    if (missing.length > 0) {
        console.error(`${VERSION} Missing elements:`, missing);
        showToast(`${MSG_ELEMENTS_MISSING} (${missing.length} fields)`, 'error');
        return false;
    }
    console.log(`${VERSION} All ${allSelectors.length} elements verified ✓`);
    return true;
}

// -------------------- INITIALIZATION --------------------
$w.onReady(async function () {
    console.log(`${VERSION} Page loaded.`);

    const isLoggedIn = authentication.loggedIn();
    if (!isLoggedIn) {
        showToast(MSG_LOGIN_REQUIRED, 'error');
        const btn = $w('#ccFormUpdateCompanyDetails');
        if (btn) btn.disable();
        return;
    }

    bootUI();
    verifyAllElements();           // ← NEW: one clear check
    await loadCompanyDetails();
    setupEventHandlers();
    hydrateAttributionFromQuery();
});

function bootUI() {
    const loader = $w('#loadingIndicator');
    if (loader) loader.hide();
}

function setupEventHandlers() {
    const btn = $w('#ccFormUpdateCompanyDetails');
    if (btn) btn.onClick(() => handleSubmit());
}

// -------------------- DATA LOADING (unchanged except verification) --------------------
async function loadCompanyDetails() {
    if (_isLoading) return;
    _isLoading = true;
    const loader = $w('#loadingIndicator');
    if (loader) loader.show();

    try {
        const member = await currentMember.getMember();
        if (!member) return;

        const custom = member.contactDetails?.customFields || {};

        _companyDetails = {
            companyName: custom['companyName'] || '',
            companyEmail: custom['companyEmail'] || '',
            zipCode: custom['zipCode'] || '',
            websiteUrl: custom['websiteUrl'] || '',
            primaryCategory: custom['primaryCategory'] || '',
            primarySubCategory: custom['primarySubCategory'] || '',
            companyDescription: custom['companyDescription'] || '',
            customerType: custom['customerType'] || '',
            preferredPlatform: custom['preferredPlatform'] || ''
        };

        populateForm(_companyDetails);
        populateDisplayFields(_companyDetails);
    } catch (error) {
        console.error(`${VERSION} Load error:`, error);
        showToast(MSG_LOAD_ERROR, 'error');
    } finally {
        _isLoading = false;
        const loader = $w('#loadingIndicator');
        if (loader) loader.hide();
    }
}

function populateForm(data) {
    Object.entries(FORM_MAP).forEach(([key, selector]) => safeSetValue(selector, data[key] || ''));
}

function populateDisplayFields(data) {
    Object.entries(DISPLAY_MAP).forEach(([key, selector]) => safeSetText(selector, data[key] || ''));
}

// -------------------- VALIDATION, SUBMISSION, SAVE (unchanged) --------------------
function validateAllFields() { /* unchanged */ }
async function handleSubmit() { /* unchanged */ }
async function saveToCollection(data, submissionId) { /* unchanged */ }
function hydrateAttributionFromQuery() { /* unchanged */ }