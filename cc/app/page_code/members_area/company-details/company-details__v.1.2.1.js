/**
 * COMPANY DETAILS BUSINESS HUB
 * v1.2.0
 *
 * Displays and manages static company profile information (logo, colors, products, audience, industry).
 * Allows the user to view and update their business details, which are stored in the member profile
 * and optionally backed up to a Wix Data collection.
 *
 * Content Creator 2.0
 */

import { currentMember } from 'wix-members-frontend';   // modern members API
import wixData from 'wix-data';
import wixLocation from 'wix-location-frontend';         // replaces wix-window for query

// -----------------------------------------------------------------
// CONSTANTS
// -----------------------------------------------------------------
const VERSION = 'company-details v1.0.1';
const COMPANY_COLLECTION = 'CompanyProfiles';
const MSG_SAVE_SUCCESS = 'Company details saved successfully.';
const MSG_SAVE_ERROR = 'Failed to save details. Please try again.';
const MSG_LOAD_ERROR = 'Could not load your company details.';
const MSG_LOGIN_REQUIRED = 'You must be logged in to manage company details.';

// -----------------------------------------------------------------
// MODULE STATE
// -----------------------------------------------------------------
let companyDetails = null;        // cached company data from profile
let isLoading = false;            // prevents concurrent operations
let currentSubmissionId = null;   // unique ID for the current save operation

// -----------------------------------------------------------------
// SAFE UI HELPERS (handles missing elements gracefully)
// -----------------------------------------------------------------
function safeGetElement(selector) {
  const el = $(selector);
  return el ? el : null;
}

function safeSetValue(selector, value) {
  const el = safeGetElement(selector);
  if (el) el.value = value || '';
}

function safeShow(selector) {
  const el = safeGetElement(selector);
  if (el) el.show();
}

function safeHide(selector) {
  const el = safeGetElement(selector);
  if (el) el.hide();
}

function safeDisable(selector, disabled = true) {
  const el = safeGetElement(selector);
  if (el) el.disabled = disabled;
}

function safeEnable(selector) {
  safeDisable(selector, false);
}

// -----------------------------------------------------------------
// CUSTOM TOAST (replaces wixWindow.showToast)
// -----------------------------------------------------------------
function showToast(message, type = 'success') {
  // Set the message text
  const toastText = safeGetElement('#toastText');
  if (toastText) toastText.text = message;

  // Show the toast container (assumes #toastGroup is a hidden group)
  safeShow('#toastGroup');

  // Auto‑hide after 3 seconds
  setTimeout(() => safeHide('#toastGroup'), 3000);
}

// -----------------------------------------------------------------
// FIELD ERROR HANDLING
// -----------------------------------------------------------------
function showFieldError(fieldSelector, errorMessage) {
  const errorElementSelector = fieldSelector.replace('Input', 'Error');
  const errorEl = safeGetElement(errorElementSelector);
  if (errorEl) {
    errorEl.text = errorMessage;
    errorEl.show();
  }
}

function hideAllFieldErrors() {
  const errorSelectors = [
    'companyNameError',
    'emailError',
    'zipCodeError',
    'websiteError',
    'categoryError',
    'subCategoryError',
    'descriptionError',
    'customerTypeError',
    'platformError'
  ];
  errorSelectors.forEach(selector => safeHide(selector));
}

// -----------------------------------------------------------------
// INITIALIZATION
// -----------------------------------------------------------------
$w.onReady(async function () {
  console.log(`${VERSION} Page loaded.`);

  // Hide success message initially
  safeHide('#successMessage');

  // Check login status
  const user = currentMember;
  if (!user.loggedIn) {
    showToast(MSG_LOGIN_REQUIRED, 'error');
    safeDisable('#submitButton');
    return;
  }

  // Bootstrap UI
  bootUI();

  // Load existing company details
  await loadCompanyDetails();

  // Wire event handlers
  setupEventHandlers();

  // Optionally hydrate from URL parameters (e.g., utm_* for attribution)
  hydrateAttributionFromQuery();
});

function bootUI() {
  console.log(`${VERSION} Bootstrapping UI.`);
  hideAllFieldErrors();
  safeHide('#loadingIndicator');
}

function setupEventHandlers() {
  $w('#submitButton').onClick(() => handleSubmit());
  // Additional event listeners can be added here (e.g., real‑time validation)
}

// -----------------------------------------------------------------
// DATA LOADING
// -----------------------------------------------------------------
async function loadCompanyDetails() {
  if (isLoading) return;
  isLoading = true;
  safeShow('#loadingIndicator');

  try {
    console.log(`${VERSION} Fetching current member profile.`);
    const member = await currentMember.getMember();
    const custom = member.profile?.custom || {};

    companyDetails = {
      companyName: custom.companyName || '',
      companyEmail: custom.companyEmail || '',
      zipCode: custom.zipCode || '',
      websiteUrl: custom.websiteUrl || '',
      primaryCategory: custom.primaryCategory || '',
      primarySubCategory: custom.primarySubCategory || '',
      companyDescription: custom.companyDescription || '',
      customerType: custom.customerType || '',
      preferredPlatform: custom.preferredPlatform || ''
    };

    populateForm(companyDetails);
    console.log(`${VERSION} Profile loaded.`, companyDetails);
  } catch (error) {
    console.error(`${VERSION} Failed to load member profile:`, error);
    showToast(MSG_LOAD_ERROR, 'error');
  } finally {
    isLoading = false;
    safeHide('#loadingIndicator');
  }
}

function populateForm(data) {
  safeSetValue('#companyNameInput', data.companyName);
  safeSetValue('#emailInput', data.companyEmail);
  safeSetValue('#zipCodeInput', data.zipCode);
  safeSetValue('#websiteInput', data.websiteUrl);
  safeSetValue('#categoryDropdown', data.primaryCategory);
  safeSetValue('#subCategoryDropdown', data.primarySubCategory);
  safeSetValue('#descriptionTextArea', data.companyDescription);
  safeSetValue('#customerTypeDropdown', data.customerType);
  safeSetValue('#platformDropdown', data.preferredPlatform);   // fixed spelling
}

// -----------------------------------------------------------------
// VALIDATION
// -----------------------------------------------------------------
function validateAllFields() {
  hideAllFieldErrors();

  const companyName = $w('#companyNameInput').value;
  const email = $w('#emailInput').value;
  const zipCode = $w('#zipCodeInput').value;
  const website = $w('#websiteInput').value;
  const primaryCategory = $w('#categoryDropdown').value;
  const primarySubCategory = $w('#subCategoryDropdown').value;
  const description = $w('#descriptionTextArea').value;
  const customerType = $w('#customerTypeDropdown').value;
  const platform = $w('#platformDropdown').value;

  let isValid = true;

  // Required fields
  if (!companyName || companyName.trim() === '') {
    showFieldError('#companyNameInput', 'Company name is required.');
    isValid = false;
  }

  if (!email || email.trim() === '') {
    showFieldError('#emailInput', 'Email is required.');
    isValid = false;
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    showFieldError('#emailInput', 'Enter a valid email address.');
    isValid = false;
  }

  // Optional but format checks
  if (zipCode && !/^\d{5}(-\d{4})?$/.test(zipCode)) {
    showFieldError('#zipCodeInput', 'Enter a valid ZIP code (e.g., 12345 or 12345-6789).');
    isValid = false;
  }

  if (website && !/^https?:\/\/.+/.test(website)) {
    showFieldError('#websiteInput', 'Enter a valid URL starting with http:// or https://');
    isValid = false;
  }

  // Dropdown selections (if they are required)
  if (!primaryCategory) {
    showFieldError('#categoryDropdown', 'Please select a category.');
    isValid = false;
  }

  if (!primarySubCategory) {
    showFieldError('#subCategoryDropdown', 'Please select a sub-category.');
    isValid = false;
  }

  if (!customerType) {
    showFieldError('#customerTypeDropdown', 'Please select a customer type.');
    isValid = false;
  }

  if (!platform) {
    showFieldError('#platformDropdown', 'Please select a preferred platform.');
    isValid = false;
  }

  return isValid;
}

// -----------------------------------------------------------------
// SUBMIT HANDLER
// -----------------------------------------------------------------
async function handleSubmit() {
  if (isLoading) return;
  isLoading = true;
  safeDisable('#submitButton');
  safeHide('#successMessage');

  console.log(`${VERSION} Submit triggered.`);

  // Validate all fields
  if (!validateAllFields()) {
    console.log(`${VERSION} Validation failed.`);
    isLoading = false;
    safeEnable('#submitButton');
    return;
  }

  // Collect values
  const payload = {
    companyName: $w('#companyNameInput').value,
    companyEmail: $w('#emailInput').value,
    zipCode: $w('#zipCodeInput').value,
    websiteUrl: $w('#websiteInput').value,
    primaryCategory: $w('#categoryDropdown').value,
    primarySubCategory: $w('#subCategoryDropdown').value,
    companyDescription: $w('#descriptionTextArea').value,
    customerType: $w('#customerTypeDropdown').value,
    preferredPlatform: $w('#platformDropdown').value
  };

  // Generate unique submission ID (replaces wix-crypto)
  currentSubmissionId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

  try {
    // 1. Update member profile
    console.log(`${VERSION} Updating member profile.`);
    await currentMember.updateMember({
      profile: { custom: payload }
    });

    // 2. Store in collection (fallback)
    await saveToCollection(payload, currentSubmissionId);

    // 3. Optionally call external webhook via backend (if configured)
    await callWebhookIfEnabled(payload, currentSubmissionId);

    // Success
    safeShow('#successMessage');
    showToast(MSG_SAVE_SUCCESS, 'success');
    console.log(`${VERSION} Save completed successfully.`);

    // Refresh local cache
    companyDetails = payload;
  } catch (error) {
    console.error(`${VERSION} Error during save.`, error);
    showToast(MSG_SAVE_ERROR, 'error');
  } finally {
    isLoading = false;
    safeEnable('#submitButton');
  }
}

async function saveToCollection(data, submissionId) {
  try {
    const item = {
      ...data,
      submissionId,
      memberId: (await currentMember.getMember())._id,
      lastUpdated: new Date().toISOString()
    };
    await wixData.insert(COMPANY_COLLECTION, item);   // fixed typo
    console.log(`${VERSION} Data backed up to collection.`);
  } catch (error) {
    console.error(`${VERSION} Failed to save to collection.`, error);
    // Non‑blocking – user already sees success
  }
}

async function callWebhookIfEnabled(data, submissionId) {
  // This would typically call a backend web module with retry logic.
  // For now, we log a placeholder.
  console.log(`${VERSION} Webhook call skipped (not implemented).`);
  // Example of calling a backend function:
  // const result = await callCompanyWebhook(data, submissionId);
  // if (!result.ok) console.warn(`${VERSION} Webhook failed.`);
}

// -----------------------------------------------------------------
// ATTRIBUTION (QUERY PARAMS)
// -----------------------------------------------------------------
function hydrateAttributionFromQuery() {
  const query = wixLocation.query;   // correct module
  const utmSource = query.utm_source || '';
  const utmMedium = query.utm_medium || '';
  const utmCampaign = query.utm_campaign || '';
  const ref = query.ref || '';

  if (utmSource || utmMedium || utmCampaign || ref) {
    console.log(`${VERSION} Attribution from URL: `, { utmSource, utmMedium, utmCampaign, ref });
    // Store in module state or hidden fields for later inclusion in payload
    // (e.g., attach to the collection record or webhook payload)
  }
}

// -----------------------------------------------------------------
// DEBUG EXPORTS (accessible from browser console)
// -----------------------------------------------------------------
// These functions are attached to the window for debugging.
window.debugCompanyDetails = function() {
  console.log(`${VERSION} Current state: `, {
    companyDetails,
    isLoading,
    currentSubmissionId,
    formValues: {
      companyName: $w('#companyNameInput').value,
      email: $w('#emailInput').value
    }
  });
};

window.debugForceLoad = function() {
  return loadCompanyDetails();
};