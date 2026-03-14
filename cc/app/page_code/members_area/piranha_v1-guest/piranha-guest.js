/***************************************************************************************************
 * CONTENT CREATOR 2.0
 * Pirana Engine v.1.2.0
 * 
 * "GUEST"
 * Genetates using the piranha engine.
 **************************************************************************************************/

import wixData from 'wix-data';
import wixLocation from 'wix-location';
import wixWindowFrontend from 'wix-window-frontend';
import { getTaxonomy } from 'backend/categoryService.web';

import {sendToWebhook,validateWebhookConnection,validatePainPointWebhook,getPainPoints} from 'backend/contentCreatorBackend.web'; // SANDBOX
// import {sendToWebhook,validateWebhookConnection,validatePainPointWebhook,getPainPoints} from 'backend/ccPromotionalAdService.web'; // PRODUCTION

const SUBMISSIONS_COLLECTION = 'UniversalIntakeSubmissions';
const SUBMISSIONS_FALLBACK_COLLECTION = 'ContentCreatorSubmissions';

// ==================== USER-FACING MESSAGES ====================
const MSG_GENERIC_FORM_ERROR = 'Please correct the highlighted fields';
const MSG_TAXONOMY_LOAD_ERROR = 'Unable to load business categories. Please refresh the page.';
const MSG_WEBHOOK_ERROR = 'Submission saved but content creation request failed. We\'ll follow up separately.';
const MSG_WEBHOOK_404_ERROR = 'Content creation service is temporarily unavailable. Your submission has been saved and our team will process it manually.';
const MSG_SUBMISSION_SUCCESS = 'Thank you! Your content preferences have been received and are being processed.';
const MSG_COLLECTION_ERROR = 'Unable to save your submission. Please try again or contact support.';
const MSG_BACKEND_UNAVAILABLE = 'Backend services are temporarily unavailable. Your data will be saved locally.';
const MSG_VALIDATION_ERROR = 'Please check your information and try again.';
const MSG_RATE_LIMIT_ERROR = 'Too many requests. Please wait a moment and try again.';

// ==================== STATIC DROPDOWN OPTIONS ====================
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

// Default pain points (fallback)
const DEFAULT_PAIN_POINTS = [
  { label: 'Authenticity & Trust Deficit: Overcoming AI fatigue and proving you\'re real', value: 'authenticity-trust-deficit' },
  { label: 'Decision Fatigue & Choice Overload: Helping customers choose faster with confidence', value: 'decision-fatigue-choice-overload' },
  { label: 'Economic Caution & ROI Anxiety: Justifying value and preventing buyer’s remorse', value: 'economic-caution-roi-anxiety' },
  { label: 'Ad Fatigue & Digital Noise: Standing out in a cluttered feed', value: 'ad-fatigue-digital-noise' },
  { label: 'Privacy & Data Mistrust: Building trust through transparency and permission', value: 'privacy-data-mistrust' },
  { label: 'Buying Friction & Checkout Drop-Off: Reducing steps between interest and purchase', value: 'buying-friction-checkout-drop-off' },
  { label: 'Sustainability & Ethical Skepticism: Addressing environmental and moral concerns', value: 'sustainability-ethical-skepticism' },
  { label: 'Community & Belonging Gap: Turning audiences into engaged insiders', value: 'community-belonging-gap' }
];

const SOCIAL_MEDIA_PLATFORM_OPTIONS = [
  { label: 'Select a social media platform...', value: '', disabled: true },
  { label: 'Instagram', value: 'instagram' },
  { label: 'TikTok', value: 'tiktok' },
  { label: 'YouTube', value: 'youtube' },
  { label: 'LinkedIn', value: 'linkedin' },
  { label: 'Facebook', value: 'facebook' }
];

const TONE_OPTIONS = [
  { label: 'Select a tone...', value: '', disabled: true },
  { label: 'Conversational & Natural', value: 'conversational-natural' },
  { label: 'Empathetic & Supportive', value: 'empathetic-supportive' },
  { label: 'Energetic & Upbeat', value: 'energetic-upbeat' },
  { label: 'Authoritative & Confident', value: 'authoritative-confident' },
  { label: 'Narrative & Story-Driven', value: 'narrative-story-driven' },
  { label: 'Casual & "Gen Z"', value: 'casual-gen-z' },
  { label: 'Informative & Clear', value: 'informative-clear' },
  { label: 'Rugged & Authentic', value: 'rugged-authentic' },
  { label: 'Lore-Driven Narration', value: 'lore-driven-narration' },
  { label: 'The "Human" AI Tone', value: 'human-ai-tone' },
  { label: 'Neutral British Commercial', value: 'neutral-british-commercial' }
];

const NARRATOR_OPTIONS = [
  { label: 'Select a narrator...', value: '', disabled: true },
  { label: '"Gen Z" Digital Native (Ages 16-25)', value: 'gen-z-digital-native' },
  { label: 'Relatable Millennial Professional (Ages 28-42)', value: 'relatable-millennial-professional' },
  { label: '"Silver" Authority (Ages 55+ / Boomers)', value: 'silver-authority' },
  { label: '"Behind-the-Scenes" Employee (All Ages)', value: 'behind-the-scenes-employee' },
  { label: 'Micro-Creator/Niche Expert', value: 'micro-creator-niche-expert' }
];

// ==================== FIELD ERROR MAPPINGS ====================
const FIELD_ERROR_MESSAGES = {
  '#ccCompanyName': 'Company name is required',
  '#ccEmail': 'Valid email is required',
  '#ccZipCode': 'Zip code is required',
  '#ccBusinessCategory': 'Please select a business category',
  '#ccBusinessSubCategory': 'Please select a sub-category',
  '#ccCompanyDescription': 'Company description is helpful',
  '#ccCustomerBase': 'Please select your primary customer base',
  '#ccCustomerPainPoint': 'Please select the main challenge you face',
  '#ccSocialMediaPlatform': 'Please select a social media platform',
  '#ccTone': 'Please select a tone for your content',
  '#ccNarrator': 'Please select a narrator persona',
  '#ccAssetRightsTerms': 'You must agree to the Asset Rights & Terms',
  '#ccContentResultPolicy': 'You must agree to the Content Result Policy',
  '#ccContentDeliveyPolicy': 'You must agree to the Content Delivery Policy'
};

const ERROR_P_IDS = [
  '#ccErrorCompanyName',
  '#ccErrorEmail',
  '#ccErrorZipCode',
  '#ccErrorBusinessCategory',
  '#ccErrorBusinessSubCategory',
  '#ccErrorCompanyDescription',
  '#ccErrorCustomerBase',
  '#ccErrorCustomerPainPoints',
  '#ccErrorSocialMediaPlatform',
  '#ccErrorTone',
  '#ccErrorNarrator',
  '#ccErrorAssetRightsTerms',
  '#ccErrorContentResultPolicy',
  '#ccErrorContentDeliveyPolicy'
];

const FIELD_TO_ERROR_P = {
  '#ccCompanyName': '#ccErrorCompanyName',
  '#ccEmail': '#ccErrorEmail',
  '#ccZipCode': '#ccErrorZipCode',
  '#ccBusinessCategory': '#ccErrorBusinessCategory',
  '#ccBusinessSubCategory': '#ccErrorBusinessSubCategory',
  '#ccCompanyDescription': '#ccErrorCompanyDescription',
  '#ccCustomerBase': '#ccErrorCustomerBase',
  '#ccCustomerPainPoint': '#ccErrorCustomerPainPoints',
  '#ccSocialMediaPlatform': '#ccErrorSocialMediaPlatform',
  '#ccTone': '#ccErrorTone',
  '#ccNarrator': '#ccErrorNarrator',
  '#ccAssetRightsTerms': '#ccErrorAssetRightsTerms',
  '#ccContentResultPolicy': '#ccErrorContentResultPolicy',
  '#ccContentDeliveyPolicy': '#ccErrorContentDeliveyPolicy'
};

// ==================== STATE VARIABLES ====================
let validationState = {
  step1: { companyName: false, email: false, zipCode: false },
  step2: { businessCategory: false, businessSubCategory: false },
  step3: { customerBase: false, customerPainPoint: false },
  step4: { socialMediaPlatform: false, tone: false, narrator: false },
  step5: { assetRightsTerms: false, contentResultPolicy: false, contentDeliveryPolicy: false }
};

let _taxonomyCache = null;
let STEP_STATE_IDS = [];
let currentStepIndex = 0;
let _sessionAttribution = {
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_content: null,
  utm_term: null,
  ref: null
};

// Webhook statuses
let _mainWebhookStatus = {
  configured: null,
  testPassed: false,
  lastCheck: null,
  details: null,
  ready: false,
  error: null
};

let _painPointWebhookStatus = {
  configured: null,
  testPassed: false,
  lastCheck: null,
  details: null,
  ready: false,
  error: null
};

let _collectionExists = null;
let _backendAvailable = true;
let _currentSubmissionId = null;

// Step 3 dynamic pain points
let _lastPainPointParams = null;

// ==================== HELPER FUNCTIONS FOR HUMANIZING SLUGS ====================
/**
 * Convert a slug to a human-readable title.
 * e.g., "digital-products" -> "Digital Products", "b2b-business-to-business" -> "B2B Business to Business"
 */
function humanizeSlug(slug) {
  if (!slug) return '';
  // Replace hyphens with spaces
  let words = slug.split('-');
  // Capitalize each word, but preserve common acronyms
  words = words.map(word => {
    // List of words that should remain uppercase
    const acronyms = ['b2b', 'b2c', 'b2g', 'ngo', 'ai', 'fba', 'ev', 'rv', 'fba', 'etsy', 'turo'];
    if (acronyms.includes(word.toLowerCase())) {
      return word.toUpperCase();
    }
    // Capitalize first letter, rest lowercase
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  return words.join(' ');
}

/**
 * Get human-readable label for a parent category slug.
 */
function getCategoryLabel(slug) {
  if (!_taxonomyCache || !_taxonomyCache.parents) return humanizeSlug(slug);
  const found = _taxonomyCache.parents.find(p => p.value === slug);
  return found ? found.label : humanizeSlug(slug);
}

/**
 * Get human-readable label for a subcategory slug given its parent slug.
 */
function getSubCategoryLabel(parentSlug, subSlug) {
  if (!_taxonomyCache || !_taxonomyCache.childrenByParent) return humanizeSlug(subSlug);
  const children = _taxonomyCache.childrenByParent[parentSlug];
  if (!children) return humanizeSlug(subSlug);
  const found = children.find(c => c.value === subSlug || c.slug === subSlug);
  return found ? found.label : humanizeSlug(subSlug);
}

/**
 * Get human-readable label for customer base slug.
 */
function getCustomerBaseLabel(slug) {
  const found = CUSTOMER_BASE_OPTIONS.find(opt => opt.value === slug);
  return found ? found.label : humanizeSlug(slug);
}

// ==================== INITIALIZATION ====================
$w.onReady(async () => {
  console.log('[cc-v7.9.0] onReady - Initializing Content Creator v7.9.0');

  try {
    bootUI();
    STEP_STATE_IDS = resolveWizardStates();

    if (STEP_STATE_IDS.length === 0) {
      console.error('[cc-v7.9.0] No wizard states found!');
      return;
    }

    switchToStep(0, { reason: 'initial_load' });
    wireWizardNavigation();
    wireTaxonomyHandlers();
    wireCheckboxHandlers();
    wireCustomerBaseHandler();
    hydrateAttributionFromQuery();
    await checkWebhookConnections(); // now checks both
    await checkCollectionExists();
    await hydrateTaxonomyWithRetry();
  } catch (error) {
    console.error('[cc-v7.9.0] Initialization failed:', error);
    showError('Failed to initialize form. Please refresh the page.', [], null, true);
  }
});

function bootUI() {
  console.log('[cc-v7.9.0] bootUI - Setting up initial UI state');
  hideError();

  // Category dropdowns (loading state)
  safeSetOptions('#ccBusinessCategory', [{ label: 'Loading business categories...', value: '', disabled: true }]);
  safeSetOptions('#ccBusinessSubCategory', [{ label: 'Select a category first...', value: '', disabled: true }]);
  safeDisable('#ccBusinessCategory', true);
  safeDisable('#ccBusinessSubCategory', true);

  // Customer base
  if ($w('#ccCustomerBase')) {
    safeSetOptions('#ccCustomerBase', CUSTOMER_BASE_OPTIONS);
    safeDisable('#ccCustomerBase', true);
  }

  // Pain points – initially disabled and placeholder
  if ($w('#ccCustomerPainPoint')) {
    safeSetOptions('#ccCustomerPainPoint', [{ label: 'Select customer base first...', value: '', disabled: true }]);
    safeDisable('#ccCustomerPainPoint', true);
  }

  // Loading text for pain points – hide initially
  safeHide('#ccLoadingPainPoints');

  // Social media
  if ($w('#ccSocialMediaPlatform')) {
    safeSetOptions('#ccSocialMediaPlatform', SOCIAL_MEDIA_PLATFORM_OPTIONS);
    safeDisable('#ccSocialMediaPlatform', true);
  }

  // Tone
  if ($w('#ccTone')) {
    safeSetOptions('#ccTone', TONE_OPTIONS);
    safeDisable('#ccTone', true);
  }

  // Narrator
  if ($w('#ccNarrator')) {
    safeSetOptions('#ccNarrator', NARRATOR_OPTIONS);
    safeDisable('#ccNarrator', true);
  }

  // Checkboxes
  if ($w('#ccAssetRightsTerms')) {
    $w('#ccAssetRightsTerms').checked = false;
    safeDisable('#ccAssetRightsTerms', true);
  }
  if ($w('#ccContentResultPolicy')) {
    $w('#ccContentResultPolicy').checked = false;
    safeDisable('#ccContentResultPolicy', true);
  }
  if ($w('#ccContentDeliveyPolicy')) {
    $w('#ccContentDeliveyPolicy').checked = false;
    safeDisable('#ccContentDeliveyPolicy', true);
  }

  // Buttons
  safeShow('#ccBtnNext');
  safeHide('#ccBtnSubmit');
  safeDisable('#ccBtnBack', true);
  safeDisable('#ccBtnSubmit', true);

  // Ensure submitting overlay is hidden initially
  safeHide('#ccSubmitStack');
}

// ==================== WEBHOOK CONNECTION CHECKS ====================
async function checkWebhookConnections() {
  try {
    console.log('[cc-v7.9.0] Checking main webhook configuration...');
    if (typeof validateWebhookConnection !== 'function') {
      console.warn('[cc-v7.9.0] validateWebhookConnection not available');
      _backendAvailable = false;
      _mainWebhookStatus = {
        configured: false,
        testPassed: false,
        lastCheck: null,
        details: null,
        ready: false,
        error: 'Backend module missing'
      };
    } else {
      const result = await validateWebhookConnection();
      _mainWebhookStatus = {
        configured: result.configured || false,
        testPassed: result.ready || false,
        lastCheck: new Date().toISOString(),
        details: result.details || null,
        ready: result.ready || false,
        error: result.error || null
      };
      console.log('[cc-v7.9.0] Main webhook status:', _mainWebhookStatus);
    }

    console.log('[cc-v7.9.0] Checking pain point webhook configuration...');
    if (typeof validatePainPointWebhook !== 'function') {
      console.warn('[cc-v7.9.0] validatePainPointWebhook not available');
      _painPointWebhookStatus = {
        configured: false,
        testPassed: false,
        lastCheck: null,
        details: null,
        ready: false,
        error: 'Backend module missing'
      };
    } else {
      const result = await validatePainPointWebhook();
      _painPointWebhookStatus = {
        configured: result.configured || false,
        testPassed: result.ready || false,
        lastCheck: new Date().toISOString(),
        details: result.details || null,
        ready: result.ready || false,
        error: result.error || null
      };
      console.log('[cc-v7.9.0] Pain point webhook status:', _painPointWebhookStatus);
    }

    _backendAvailable = true; // we have at least some backend functions

    // Show warning if either webhook is not ready, but don't block
    if (!_mainWebhookStatus.ready) {
      showError(MSG_WEBHOOK_404_ERROR, [], null, false, 0);
    }
  } catch (error) {
    console.error('[cc-v7.9.0] Webhook checks failed:', error.message);
    _backendAvailable = false;
    _mainWebhookStatus = { configured: false, testPassed: false, lastCheck: null, details: null, ready: false, error: error.message };
    _painPointWebhookStatus = { configured: false, testPassed: false, lastCheck: null, details: null, ready: false, error: error.message };
  }
}

async function checkCollectionExists() {
  try {
    console.log('[cc-v7.9.0] Checking if collection exists...');
    try {
      await wixData.query(SUBMISSIONS_COLLECTION).limit(1).find();
      _collectionExists = SUBMISSIONS_COLLECTION;
      console.log(`[cc-v7.9.0] Collection exists: ${SUBMISSIONS_COLLECTION}`);
      return true;
    } catch (error) {
      if (error.message && error.message.includes('WDE0025')) {
        console.warn(`[cc-v7.9.0] Collection ${SUBMISSIONS_COLLECTION} doesn't exist, trying fallback...`);
        try {
          await wixData.query(SUBMISSIONS_FALLBACK_COLLECTION).limit(1).find();
          _collectionExists = SUBMISSIONS_FALLBACK_COLLECTION;
          console.log(`[cc-v7.9.0] Using fallback collection: ${SUBMISSIONS_FALLBACK_COLLECTION}`);
          return true;
        } catch (fallbackError) {
          console.error(`[cc-v7.9.0] Fallback collection also doesn't exist: ${fallbackError.message}`);
          _collectionExists = null;
          showError('Warning: Database not configured. Submissions will be logged but not saved.', [], null, false, 8000);
          return false;
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('[cc-v7.9.0] Collection check failed:', error);
    _collectionExists = null;
    return false;
  }
}

// ==================== TAXONOMY ====================
async function hydrateTaxonomyWithRetry(maxRetries = 2) {
  console.log('[cc-v7.9.0] Starting taxonomy hydration...');
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      console.log(`[cc-v7.9.0] Loading taxonomy (attempt ${attempt}/${maxRetries + 1})...`);
      const result = await getTaxonomy();
      if (!result || !result.parentOptions) throw new Error('Invalid taxonomy data structure');
      if (result.parentOptions.length === 0) {
        console.warn('[cc-v7.9.0] Taxonomy returned 0 parent options');
        if (result.error) throw new Error(`Taxonomy error: ${result.error}`);
        if (result.parentOptions && result.parentOptions.length > 0) {
          _taxonomyCache = { parents: result.parentOptions, childrenByParent: result.childrenByParent || {}, raw: result, source: 'api' };
        } else {
          throw new Error('No business categories available');
        }
      } else {
        console.log('[cc-v7.9.0] Taxonomy loaded successfully:', {
          parentCount: result.parentOptions.length,
          categories: result.parentOptions.map(p => p.label).slice(0, 5)
        });
        _taxonomyCache = { parents: result.parentOptions, childrenByParent: result.childrenByParent || {}, raw: result, source: 'api' };
      }
      updateCategoryDropdowns();
      return true;
    } catch (err) {
      console.error(`[cc-v7.9.0] Taxonomy load failed (attempt ${attempt}):`, err);
      if (attempt > maxRetries) {
        console.log('[cc-v7.9.0] All retries failed, using fallback data');
        useFallbackTaxonomy();
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

function updateCategoryDropdowns() {
  if (!_taxonomyCache || !_taxonomyCache.parents) {
    console.error('[cc-v7.9.0] No taxonomy data to update dropdowns');
    return;
  }
  const parentOptions = [{ label: 'Select a business category...', value: '', disabled: true }].concat(
    _taxonomyCache.parents.map(parent => ({ label: parent.label || 'Unknown', value: parent.value || '' }))
  );
  safeSetOptions('#ccBusinessCategory', parentOptions);
  safeDisable('#ccBusinessCategory', false);
  console.log('[cc-v7.9.0] Category dropdown updated with', parentOptions.length - 1, 'options');
}

function useFallbackTaxonomy() {
  console.log('[cc-v7.9.0] Using fallback taxonomy data');
  const fallbackParents = [
    { label: 'Automotive', value: 'automotive' },
    { label: 'Digital Products', value: 'digital-products' },
    { label: 'Food & Dining', value: 'food-and-dining' },
    { label: 'General Services', value: 'general-services' },
    { label: 'Health & Medicine', value: 'health-and-medicine' },
    { label: 'Home & Garden', value: 'home-and-garden' },
    { label: 'Local Services', value: 'local-services' },
    { label: 'Other', value: 'other' },
    { label: 'Professional Services', value: 'professional-services' },
    { label: 'Religious', value: 'religious' },
    { label: 'Retail & Shopping', value: 'retail-and-shopping' }
  ];
  const fallbackChildren = {
    'automotive': [
      { label: 'Auto Accessories & Customization', value: 'auto-accessories-and-customization' },
      { label: 'Auto Body Shop', value: 'auto-body-shop' },
      { label: 'Auto Content Creators', value: 'auto-content-creators' },
      { label: 'Auto Detailing Service', value: 'auto-detailing-service' },
      { label: 'Auto Glass Shop', value: 'auto-glass-shop' },
      { label: 'Auto Parts Store', value: 'auto-parts-store' },
      { label: 'Car Dealership', value: 'car-dealership' },
      { label: 'Car Repair', value: 'car-repair' },
      { label: 'Car Wash', value: 'car-wash' }
    ]
  };
  _taxonomyCache = { parents: fallbackParents, childrenByParent: fallbackChildren, raw: { parentOptions: fallbackParents, childrenByParent: fallbackChildren }, source: 'fallback' };
  updateCategoryDropdowns();
  showError('Using demo categories. Real categories will load on refresh.', [], null, false, 5000);
}

function wireTaxonomyHandlers() {
  if ($w('#ccBusinessCategory')) {
    $w('#ccBusinessCategory').onChange(event => {
      console.log('[cc-v7.9.0] Category changed:', event.target.value);
      hideError();
      safeCollapse('#ccErrorBusinessCategory');

      const parentSlug = (event.target.value || '').toString();
      safeSetOptions('#ccBusinessSubCategory', [{
        label: parentSlug ? 'Loading sub-categories...' : 'Select a category first...',
        value: '',
        disabled: true
      }]);

      if (!parentSlug) {
        safeDisable('#ccBusinessSubCategory', true);
        return;
      }

      const children = getChildrenForParent(parentSlug);
      if (!children || children.length === 0) {
        safeSetOptions('#ccBusinessSubCategory', [{ label: 'No sub-categories available', value: 'none', disabled: true }]);
        console.log('[cc-v7.9.0] No children found for parent:', parentSlug);
      } else {
        const options = [{ label: 'Select a sub-category...', value: '', disabled: true }].concat(
          children.map(child => ({ label: child.label || 'Unknown', value: child.value || child.slug || '' }))
        );
        safeSetOptions('#ccBusinessSubCategory', options);
        safeDisable('#ccBusinessSubCategory', false);
        console.log('[cc-v7.9.0] Loaded', children.length, 'sub-categories for', parentSlug);
      }
    });
  }
}

function getChildrenForParent(parentSlug) {
  if (!_taxonomyCache || !_taxonomyCache.childrenByParent) return [];
  if (_taxonomyCache.childrenByParent[parentSlug]) return _taxonomyCache.childrenByParent[parentSlug];
  const lowerParentSlug = parentSlug.toLowerCase();
  for (const key in _taxonomyCache.childrenByParent) {
    if (key.toLowerCase() === lowerParentSlug) return _taxonomyCache.childrenByParent[key];
  }
  return [];
}

// ==================== STEP 3 DYNAMIC PAIN POINTS ====================
function wireCustomerBaseHandler() {
  if ($w('#ccCustomerBase')) {
    $w('#ccCustomerBase').onChange(async (event) => {
      hideError();
      safeCollapse('#ccErrorCustomerBase');

      const customerBase = event.target.value;
      if (!customerBase) return;

      // Store params for potential retry
      _lastPainPointParams = {
        businessCategory: getValue('#ccBusinessCategory'),
        businessSubCategory: getValue('#ccBusinessSubCategory'),
        customerBase,
        zip: getValue('#ccZipCode'),
        companyName: getValue('#ccCompanyName')
      };

      // Disable pain point dropdown, clear any previous selection, show loading text, disable Next
      safeDisable('#ccCustomerPainPoint', true);
      if ($w('#ccCustomerPainPoint')) $w('#ccCustomerPainPoint').value = '';
      safeShow('#ccLoadingPainPoints');
      safeDisable('#ccBtnNext', true);

      // Fetch pain points
      await fetchPainPoints(_lastPainPointParams);
    });
  }
}

async function fetchPainPoints(params) {
  try {
    const result = await getPainPoints(params);
    // Hide loading text
    safeHide('#ccLoadingPainPoints');

    if (result && Array.isArray(result.options)) {
      // Success – populate dropdown and enable it
      populatePainPointDropdown(result.options);
      safeDisable('#ccCustomerPainPoint', false);
      // After enabling the dropdown, check if a value is already selected (unlikely) and update Next button
      updateStep3NextButtonState();
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('[cc-v7.9.0] Failed to fetch pain points:', error);
    safeHide('#ccLoadingPainPoints');

    // Fallback to default pain points
    populatePainPointDropdown(DEFAULT_PAIN_POINTS);
    safeDisable('#ccCustomerPainPoint', false);

    // Show a temporary error message (auto-hide after 5 seconds)
    showError('Could not load custom pain points. Using default options.', [], null, false, 5000);

    // Still update Next button state (will be disabled because no value selected)
    updateStep3NextButtonState();
  }
}

function populatePainPointDropdown(options) {
  const fullOptions = [{ label: 'Select a pain point...', value: '', disabled: true }, ...options];
  safeSetOptions('#ccCustomerPainPoint', fullOptions);
}

// ==================== CHECKBOX HANDLERS ====================
function wireCheckboxHandlers() {
  if ($w('#ccCustomerPainPoint')) {
    $w('#ccCustomerPainPoint').onChange(() => { 
      hideError(); 
      safeCollapse('#ccErrorCustomerPainPoints');
      updateStep3NextButtonState();   // enable Next when pain point is selected
    });
  }
  if ($w('#ccSocialMediaPlatform')) {
    $w('#ccSocialMediaPlatform').onChange(() => { hideError(); safeCollapse('#ccErrorSocialMediaPlatform'); });
  }
  if ($w('#ccTone')) {
    $w('#ccTone').onChange(() => { hideError(); safeCollapse('#ccErrorTone'); });
  }
  if ($w('#ccNarrator')) {
    $w('#ccNarrator').onChange(() => { hideError(); safeCollapse('#ccErrorNarrator'); });
  }
  if ($w('#ccAssetRightsTerms')) {
    $w('#ccAssetRightsTerms').onChange(() => { hideError(); safeCollapse('#ccErrorAssetRightsTerms'); updateSubmitButtonState(); });
  }
  if ($w('#ccContentResultPolicy')) {
    $w('#ccContentResultPolicy').onChange(() => { hideError(); safeCollapse('#ccErrorContentResultPolicy'); updateSubmitButtonState(); });
  }
  if ($w('#ccContentDeliveyPolicy')) {
    $w('#ccContentDeliveyPolicy').onChange(() => { hideError(); safeCollapse('#ccErrorContentDeliveyPolicy'); updateSubmitButtonState(); });
  }
}

function updateSubmitButtonState() {
  if (getCurrentStepId() !== 'ccStep5Box') return;
  const allChecked = ($w('#ccAssetRightsTerms')?.checked || false) &&
                     ($w('#ccContentResultPolicy')?.checked || false) &&
                     ($w('#ccContentDeliveyPolicy')?.checked || false);
  safeDisable('#ccBtnSubmit', !allChecked);
  console.log('[cc-v7.9.0] Submit button state updated:', { allChecked, disabled: !allChecked });
}

// ==================== ATTRIBUTION ====================
function hydrateAttributionFromQuery() {
  try {
    const qp = wixLocation.query || {};
    _sessionAttribution = {
      utm_source: qp.utm_source || null,
      utm_medium: qp.utm_medium || null,
      utm_campaign: qp.utm_campaign || null,
      utm_content: qp.utm_content || null,
      utm_term: qp.utm_term || null,
      ref: qp.ref || null
    };
    console.log('[cc-v7.9.0] Attribution loaded:', _sessionAttribution);
  } catch (err) {
    console.error('[cc-v7.9.0] Attribution hydration failed:', err);
  }
}

// ==================== VALIDATION ====================
/**
 * Validates the current step and returns a result object.
 * @returns {{isValid: boolean, message?: string, errorFields?: string[], failedField?: string}}
 */
function validateCurrentStep() {
  const stepId = getCurrentStepId();
  console.log('[cc-v7.9.0] Validating step:', stepId);

  if (stepId === 'ccStep1Box') {
    const nameValid = validateRequired('#ccCompanyName');
    const emailValid = validateRequired('#ccEmail');
    const zipValid = validateRequired('#ccZipCode');
    if (!nameValid || !emailValid || !zipValid) {
      const failedField = !nameValid ? '#ccCompanyName' : !emailValid ? '#ccEmail' : '#ccZipCode';
      return { isValid: false, message: FIELD_ERROR_MESSAGES[failedField] || MSG_GENERIC_FORM_ERROR, errorFields: [FIELD_TO_ERROR_P[failedField]].filter(Boolean), failedField };
    }
    return { isValid: true };
  }

  if (stepId === 'ccStep2Box') {
    const categoryValid = validateRequired('#ccBusinessCategory');
    if (!categoryValid) return { isValid: false, message: FIELD_ERROR_MESSAGES['#ccBusinessCategory'], errorFields: ['#ccErrorBusinessCategory'], failedField: '#ccBusinessCategory' };
    const parentSlug = $w('#ccBusinessCategory')?.value || '';
    const children = getChildrenForParent(parentSlug);
    const hasChildren = children && children.length > 0;
    if (hasChildren) {
      const subCategoryValid = validateRequired('#ccBusinessSubCategory');
      if (!subCategoryValid) return { isValid: false, message: FIELD_ERROR_MESSAGES['#ccBusinessSubCategory'], errorFields: ['#ccErrorBusinessSubCategory'], failedField: '#ccBusinessSubCategory' };
    }
    return { isValid: true };
  }

  if (stepId === 'ccStep3Box') {
    const customerBaseValid = validateRequired('#ccCustomerBase');
    if (!customerBaseValid) return { isValid: false, message: FIELD_ERROR_MESSAGES['#ccCustomerBase'], errorFields: ['#ccErrorCustomerBase'], failedField: '#ccCustomerBase' };
    const painPointValid = validateRequired('#ccCustomerPainPoint');
    if (!painPointValid) return { isValid: false, message: FIELD_ERROR_MESSAGES['#ccCustomerPainPoint'], errorFields: ['#ccErrorCustomerPainPoints'], failedField: '#ccCustomerPainPoint' };
    return { isValid: true };
  }

  if (stepId === 'ccStep4Box') {
    const socialMediaValid = validateRequired('#ccSocialMediaPlatform');
    if (!socialMediaValid) return { isValid: false, message: FIELD_ERROR_MESSAGES['#ccSocialMediaPlatform'], errorFields: ['#ccErrorSocialMediaPlatform'], failedField: '#ccSocialMediaPlatform' };
    const toneValid = validateRequired('#ccTone');
    if (!toneValid) return { isValid: false, message: FIELD_ERROR_MESSAGES['#ccTone'], errorFields: ['#ccErrorTone'], failedField: '#ccTone' };
    const narratorValid = validateRequired('#ccNarrator');
    if (!narratorValid) return { isValid: false, message: FIELD_ERROR_MESSAGES['#ccNarrator'], errorFields: ['#ccErrorNarrator'], failedField: '#ccNarrator' };
    return { isValid: true };
  }

  if (stepId === 'ccStep5Box') {
    const assetRightsValid = validateCheckbox('#ccAssetRightsTerms');
    if (!assetRightsValid) return { isValid: false, message: FIELD_ERROR_MESSAGES['#ccAssetRightsTerms'], errorFields: ['#ccErrorAssetRightsTerms'], failedField: '#ccAssetRightsTerms' };
    const contentResultValid = validateCheckbox('#ccContentResultPolicy');
    if (!contentResultValid) return { isValid: false, message: FIELD_ERROR_MESSAGES['#ccContentResultPolicy'], errorFields: ['#ccErrorContentResultPolicy'], failedField: '#ccContentResultPolicy' };
    const contentDeliveryValid = validateCheckbox('#ccContentDeliveyPolicy');
    if (!contentDeliveryValid) return { isValid: false, message: FIELD_ERROR_MESSAGES['#ccContentDeliveyPolicy'], errorFields: ['#ccErrorContentDeliveyPolicy'], failedField: '#ccContentDeliveyPolicy' };
    return { isValid: true };
  }

  return { isValid: true };
}

/**
 * Validates all fields for final submission.
 * @returns {{isValid: boolean, message?: string, errorFields?: string[]}}
 */
function validateAllForSubmit() {
  const failedFields = [];
  const errorFields = [];

  // Step 1
  if (!validateRequired('#ccCompanyName')) { failedFields.push('#ccCompanyName'); errorFields.push('#ccErrorCompanyName'); }
  if (!validateRequired('#ccEmail')) { failedFields.push('#ccEmail'); errorFields.push('#ccErrorEmail'); }
  if (!validateRequired('#ccZipCode')) { failedFields.push('#ccZipCode'); errorFields.push('#ccErrorZipCode'); }

  // Step 2
  if (!validateRequired('#ccBusinessCategory')) { failedFields.push('#ccBusinessCategory'); errorFields.push('#ccErrorBusinessCategory'); }
  const parentSlug = $w('#ccBusinessCategory')?.value || '';
  const children = getChildrenForParent(parentSlug);
  const hasChildren = children && children.length > 0;
  if (hasChildren && !validateRequired('#ccBusinessSubCategory')) { failedFields.push('#ccBusinessSubCategory'); errorFields.push('#ccErrorBusinessSubCategory'); }

  // Step 3
  if ($w('#ccCustomerBase') && !validateRequired('#ccCustomerBase')) { failedFields.push('#ccCustomerBase'); errorFields.push('#ccErrorCustomerBase'); }
  if ($w('#ccCustomerPainPoint') && !validateRequired('#ccCustomerPainPoint')) { failedFields.push('#ccCustomerPainPoint'); errorFields.push('#ccErrorCustomerPainPoints'); }

  // Step 4
  if ($w('#ccSocialMediaPlatform') && !validateRequired('#ccSocialMediaPlatform')) { failedFields.push('#ccSocialMediaPlatform'); errorFields.push('#ccErrorSocialMediaPlatform'); }
  if ($w('#ccTone') && !validateRequired('#ccTone')) { failedFields.push('#ccTone'); errorFields.push('#ccErrorTone'); }
  if ($w('#ccNarrator') && !validateRequired('#ccNarrator')) { failedFields.push('#ccNarrator'); errorFields.push('#ccErrorNarrator'); }

  // Step 5
  if ($w('#ccAssetRightsTerms') && !validateCheckbox('#ccAssetRightsTerms')) { failedFields.push('#ccAssetRightsTerms'); errorFields.push('#ccErrorAssetRightsTerms'); }
  if ($w('#ccContentResultPolicy') && !validateCheckbox('#ccContentResultPolicy')) { failedFields.push('#ccContentResultPolicy'); errorFields.push('#ccErrorContentResultPolicy'); }
  if ($w('#ccContentDeliveyPolicy') && !validateCheckbox('#ccContentDeliveyPolicy')) { failedFields.push('#ccContentDeliveyPolicy'); errorFields.push('#ccErrorContentDeliveyPolicy'); }

  if (failedFields.length > 0) {
    const firstField = failedFields[0];
    return { isValid: false, message: FIELD_ERROR_MESSAGES[firstField] || MSG_GENERIC_FORM_ERROR, errorFields };
  }
  return { isValid: true };
}

function validateRequired(selector) {
  const el = $w(selector);
  if (!el) return true;
  const value = (el.value || '').toString().trim();
  return value.length > 0;
}

function validateCheckbox(selector) {
  const el = $w(selector);
  if (!el) return true;
  return el.checked === true;
}

// ==================== STEP 3 NEXT BUTTON STATE ====================
function updateStep3NextButtonState() {
  // Only act if we are on step 3
  if (getCurrentStepId() !== 'ccStep3Box') return;
  const customerBaseValid = validateRequired('#ccCustomerBase');
  const painPointValid = validateRequired('#ccCustomerPainPoint');
  const enable = customerBaseValid && painPointValid;
  safeDisable('#ccBtnNext', !enable);
}

// ==================== PAYLOAD BUILDER (contract v1) ====================
function buildSubmissionPayload(submissionId) {
  const id = submissionId || generateSubmissionId();

  return {
    contractVersion: '1',
    submissionId: id,
    submittedAt: new Date().toISOString(),
    source: {
      app: 'wix',
      module: 'cc-promotional-ad',
      uiVersion: '7.9.0'
    },
    person: {
      email: getValue('#ccEmail'),
      companyName: getValue('#ccCompanyName'),
      zip: getValue('#ccZipCode'),
      website: getValue('#ccWebsite')
    },
    business: {
      category: getValue('#ccBusinessCategory'),
      subCategory: getValue('#ccBusinessSubCategory'),
      description: getValue('#ccCompanyDescription')
    },
    customer: {
      base: getValue('#ccCustomerBase'),
      painPoint: getValue('#ccCustomerPainPoint'),
      painPointSource: 'dynamic_webhook'
    },
    creative: {
      platform: getValue('#ccSocialMediaPlatform'),
      tone: getValue('#ccTone'),
      narrator: getValue('#ccNarrator')
    },
    legal: {
      assetRightsTerms: $w('#ccAssetRightsTerms')?.checked || false,
      contentResultPolicy: $w('#ccContentResultPolicy')?.checked || false,
      contentDeliveryPolicy: $w('#ccContentDeliveyPolicy')?.checked || false
    },
    attribution: { ..._sessionAttribution },
    runtime: {
      mainWebhook: { ..._mainWebhookStatus },
      painPointWebhook: { ..._painPointWebhookStatus }
    }
  };
}

function generateSubmissionId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `cc-${timestamp}-${random}`.toUpperCase();
}

// ==================== SUBMISSION HANDLER (updated) ====================
async function handleSubmit() {
  console.log('[cc-v7.9.0] ========== SUBMIT BUTTON CLICKED ==========');
  
  // Disable submit button to prevent double-click
  safeDisable('#ccBtnSubmit', true);

  // Hide step5 stack, show submitting overlay
  safeHide('#ccStep5Stack');
  safeShow('#ccSubmitStack');
  
  // Update status text (assuming a text element with id #ccSubmitStatus inside the stack)
  if ($w('#ccSubmitStatus')) {
    $w('#ccSubmitStatus').text = 'Sending...';
  }

  try {
    _currentSubmissionId = generateSubmissionId();
    console.log('[cc-v7.9.0] Building payload with submissionId:', _currentSubmissionId);
    const payload = buildSubmissionPayload(_currentSubmissionId);
    console.log('[cc-v7.9.0] Payload built:', { submissionId: _currentSubmissionId, contractVersion: payload.contractVersion });

    // Step 1: Store in Wix Data (optional)
    let stored = null;
    let storageSuccess = false;
    if (_collectionExists) {
      try {
        console.log('[cc-v7.9.0] Attempting to store submission in collection:', _collectionExists);
        stored = await wixData.insert(_collectionExists, payload);
        storageSuccess = true;
        console.log('[cc-v7.9.0] ✅ Submission stored successfully, ID:', stored?._id);
      } catch (storageError) {
        console.error('[cc-v7.9.0] ❌ Storage failed:', storageError);
        const otherCollection = _collectionExists === SUBMISSIONS_COLLECTION ? SUBMISSIONS_FALLBACK_COLLECTION : SUBMISSIONS_COLLECTION;
        try {
          stored = await wixData.insert(otherCollection, payload);
          storageSuccess = true;
          _collectionExists = otherCollection;
          console.log('[cc-v7.9.0] ✅ Submission stored in fallback collection:', stored?._id);
        } catch (fallbackError) {
          console.error('[cc-v7.9.0] ❌ Fallback storage also failed:', fallbackError);
        }
      }
    } else {
      console.warn('[cc-v7.9.0] No collection available for storage');
    }

    // Step 2: Send to webhook
    let webhookSuccess = false;
    let webhookError = null;
    let webhookStatusResponse = null;
    let isDuplicate = false;

    console.log('[cc-v7.9.0] Checking webhook conditions...');
    if (_backendAvailable && _mainWebhookStatus.configured && typeof sendToWebhook === 'function') {
      try {
        console.log('[cc-v7.9.0] 🚀 Calling sendToWebhook...');
        const webhookResult = await sendToWebhook(payload);
        console.log('[cc-v7.9.0] 📨 sendToWebhook returned:', webhookResult);

        if (webhookResult && webhookResult.ok === true) {
          webhookSuccess = true;
          isDuplicate = webhookResult.duplicate === true;
          webhookStatusResponse = webhookResult.status;
          console.log('[cc-v7.9.0] ✅ Webhook successful');
        } else {
          webhookSuccess = false;
          webhookError = webhookResult?.error?.message || webhookResult?.error || 'Webhook failed';
          webhookStatusResponse = webhookResult?.status;
          console.error('[cc-v7.9.0] ❌ Webhook failed', webhookResult);
        }
      } catch (webhookErr) {
        webhookSuccess = false;
        webhookError = webhookErr.message;
        console.error('[cc-v7.9.0] ❌ Webhook exception:', webhookErr);
      }
    } else {
      console.warn('[cc-v7.9.0] ⚠️ Webhook not configured or backend unavailable – skipping webhook call');
      webhookSuccess = false;
      webhookError = 'Webhook not configured';
    }

    // Step 3: Handle result
    if (webhookSuccess) {
      // Update status to success
      if ($w('#ccSubmitStatus')) {
        $w('#ccSubmitStatus').text = '✅ Submission successful!';
      }
      // Wait a moment for user to see success, then reset and go to step1
      setTimeout(() => {
        safeHide('#ccSubmitStack');
        resetForm();
        switchToStep(0, { reason: 'reset_after_success' });
        _currentSubmissionId = null;
        // Ensure step5 stack is hidden (it will be hidden by wizard, but just in case)
        safeHide('#ccStep5Stack');
      }, 1500);
    } else {
      // Failure: show error, then return to step5
      console.error('[cc-v7.9.0] ❌ Submission failed');
      if ($w('#ccSubmitStatus')) {
        $w('#ccSubmitStatus').text = `❌ Error: ${webhookError || 'Unknown error'}`;
      }
      // Wait a bit to show error, then revert
      setTimeout(() => {
        safeHide('#ccSubmitStack');
        safeShow('#ccStep5Stack');
        // Re-enable submit button
        safeDisable('#ccBtnSubmit', false);
        // Show error message using existing error display
        showError(webhookError || MSG_WEBHOOK_ERROR, [], null, false, 5000);
      }, 2000);
    }
  } catch (err) {
    console.error('[cc-v7.9.0] 🚨 Unhandled error in handleSubmit:', err);
    safeHide('#ccSubmitStack');
    safeShow('#ccStep5Stack');
    safeDisable('#ccBtnSubmit', false);
    showError('We couldn\'t submit right now. Please try again.');
  }
}

function resetForm() {
  const resetSelectors = [
    '#ccCompanyName', '#ccEmail', '#ccZipCode', '#ccWebsite',
    '#ccBusinessCategory', '#ccBusinessSubCategory',
    '#ccCustomerBase', '#ccCustomerPainPoint',
    '#ccSocialMediaPlatform', '#ccTone', '#ccNarrator',
    '#ccCompanyDescription'
  ];
  resetSelectors.forEach(selector => {
    const el = $w(selector);
    if (el && typeof el.value !== 'undefined') el.value = '';
  });
  if ($w('#ccAssetRightsTerms')) $w('#ccAssetRightsTerms').checked = false;
  if ($w('#ccContentResultPolicy')) $w('#ccContentResultPolicy').checked = false;
  if ($w('#ccContentDeliveyPolicy')) $w('#ccContentDeliveyPolicy').checked = false;
  bootUI();
}

// ==================== WIZARD NAVIGATION ====================
function wireWizardNavigation() {
  console.log('[cc-v7.9.0] wireWizardNavigation - Setting up navigation buttons');
  if ($w('#ccBtnNext')) {
    $w('#ccBtnNext').onClick(() => {
      console.log('[cc-v7.9.0] Next button clicked, current step:', currentStepIndex);
      hideError();

      const validationResult = validateCurrentStep();
      console.log('[cc-v7.9.0] Step validation result:', validationResult);

      if (!validationResult.isValid) {
        showError(validationResult.message || MSG_GENERIC_FORM_ERROR, validationResult.errorFields, validationResult.failedField);
        return;
      }

      if (getCurrentStepId() === 'ccStep2Box' && $w('#ccCustomerBase')) {
        safeDisable('#ccCustomerBase', false);
        console.log('[cc-v7.9.0] Customer base dropdown enabled for step 3');
      }
      if (getCurrentStepId() === 'ccStep3Box') {
        // Step 4 dropdowns are enabled when moving to step 4
        if ($w('#ccSocialMediaPlatform')) safeDisable('#ccSocialMediaPlatform', false);
        if ($w('#ccTone')) safeDisable('#ccTone', false);
        if ($w('#ccNarrator')) safeDisable('#ccNarrator', false);
        console.log('[cc-v7.9.0] Step 4 dropdowns enabled');
      }
      if (getCurrentStepId() === 'ccStep4Box') {
        if ($w('#ccAssetRightsTerms')) safeDisable('#ccAssetRightsTerms', false);
        if ($w('#ccContentResultPolicy')) safeDisable('#ccContentResultPolicy', false);
        if ($w('#ccContentDeliveyPolicy')) safeDisable('#ccContentDeliveyPolicy', false);
        console.log('[cc-v7.9.0] Step 5 checkboxes enabled');
      }

      setTimeout(() => {
        switchToStep(currentStepIndex + 1, { reason: 'next' });
      }, 100);
    });
  }

  if ($w('#ccBtnBack')) {
    $w('#ccBtnBack').onClick(() => {
      hideError();
      switchToStep(Math.max(0, currentStepIndex - 1), { reason: 'back' });
    });
  }

  if ($w('#ccBtnSubmit')) {
    $w('#ccBtnSubmit').onClick(async () => {
      hideError();
      const validationResult = validateAllForSubmit();
      if (!validationResult.isValid) {
        showError(validationResult.message || MSG_GENERIC_FORM_ERROR, validationResult.errorFields);
        return;
      }
      await handleSubmit();
    });
  }
}

function resolveWizardStates() {
  const available = [];
  // Removed 'ccStep6Box' from the order
  const PREFERRED_STATE_ORDER = ['ccStep1Box', 'ccStep2Box', 'ccStep3Box', 'ccStep4Box', 'ccStep5Box'];
  for (const id of PREFERRED_STATE_ORDER) {
    if ($w(`#${id}`)) available.push(id);
  }
  console.log('[cc-v7.9.0] Resolved wizard states:', available);
  return available;
}

function getCurrentStepId() {
  return STEP_STATE_IDS[currentStepIndex] || null;
}

function switchToStep(nextIndex, meta = {}) {
  if (!STEP_STATE_IDS || STEP_STATE_IDS.length === 0) {
    console.error('[cc-v7.9.0] Cannot switch step: no states available');
    return;
  }
  const maxIndex = STEP_STATE_IDS.length - 1;
  const bounded = Math.min(Math.max(nextIndex, 0), maxIndex);
  const nextStateId = STEP_STATE_IDS[bounded];
  if (!nextStateId) {
    console.error('[cc-v7.9.0] Cannot switch step: invalid state ID');
    return;
  }
  currentStepIndex = bounded;
  console.log('[cc-v7.9.0] Switching to step:', { index: currentStepIndex, stateId: nextStateId, reason: meta.reason });

  if ($w('#ccPromotionalAd') && typeof $w('#ccPromotionalAd').changeState === 'function') {
    $w('#ccPromotionalAd').changeState(nextStateId);
  } else {
    console.error('[cc-v7.9.0] State box or changeState function not found');
  }

  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === maxIndex;

  // Normal button visibility logic
  safeDisable('#ccBtnBack', isFirst);
  if (isLast) {
    safeHide('#ccBtnNext');
    safeShow('#ccBtnSubmit');
    updateSubmitButtonState();
  } else {
    safeShow('#ccBtnNext');
    safeHide('#ccBtnSubmit');
  }

  // Special handling for step 3 (same as before)
  if (nextStateId === 'ccStep3Box') {
    safeDisable('#ccCustomerPainPoint', true);
    safeSetOptions('#ccCustomerPainPoint', [{ label: 'Select customer base first...', value: '', disabled: true }]);
    safeHide('#ccLoadingPainPoints');
    safeDisable('#ccBtnNext', true);
    if ($w('#ccCustomerBase')) {
      safeDisable('#ccCustomerBase', false);
    }
    console.log('[cc-v7.9.0] Step 3 initialized: pain point disabled, next disabled');
  }

  if (nextStateId === 'ccStep4Box') {
    if ($w('#ccSocialMediaPlatform')) safeDisable('#ccSocialMediaPlatform', false);
    if ($w('#ccTone')) safeDisable('#ccTone', false);
    if ($w('#ccNarrator')) safeDisable('#ccNarrator', false);
    console.log('[cc-v7.9.0] Step 4 dropdowns enabled');
  }
  if (nextStateId === 'ccStep5Box') {
    if ($w('#ccAssetRightsTerms')) safeDisable('#ccAssetRightsTerms', false);
    if ($w('#ccContentResultPolicy')) safeDisable('#ccContentResultPolicy', false);
    if ($w('#ccContentDeliveyPolicy')) safeDisable('#ccContentDeliveyPolicy', false);
    console.log('[cc-v7.9.0] Step 5 checkboxes enabled');
  }
}

// ==================== UTILITIES ====================
function getValue(selector) {
  const el = $w(selector);
  if (!el) return null;
  const value = el.value || null;
  return value ? value.toString().trim() : null;
}

function safeDisable(selector, disabled = true) {
  const el = $w(selector);
  if (!el) return;
  if (typeof el.disable === 'function') {
    disabled ? el.disable() : el.enable?.();
  } else if (typeof el.enabled === 'boolean') {
    el.enabled = !disabled;
  } else if (typeof el.disabled === 'boolean') {
    el.disabled = disabled;
  }
}

function safeSetOptions(selector, options = []) {
  const el = $w(selector);
  if (!el || typeof el.options === 'undefined') return;
  el.options = options;
}

function safeShow(selector) {
  const el = $w(selector);
  if (el && typeof el.show === 'function') el.show();
}

function safeHide(selector) {
  const el = $w(selector);
  if (el && typeof el.hide === 'function') el.hide();
}

function safeExpand(selector) {
  const el = $w(selector);
  if (!el) return;
  if (typeof el.expand === 'function') el.expand();
  else if (typeof el.show === 'function') el.show();
}

function safeCollapse(selector) {
  const el = $w(selector);
  if (!el) return;
  if (typeof el.collapse === 'function') el.collapse();
  else if (typeof el.hide === 'function') el.hide();
}

function showError(message, visibleErrorPIds = [], specificField = null, isCritical = false, autoHideDelay = 0) {
  console.log('[cc-v7.9.0] showError called:', { message, visibleErrorPIds, specificField, isCritical });
  if ($w('#ccErrorText')) $w('#ccErrorText').text = message;
  ERROR_P_IDS.forEach(id => safeCollapse(id));
  visibleErrorPIds.forEach(id => {
    const el = $w(id);
    if (el) {
      if (typeof el.expand === 'function') el.expand();
      else if (typeof el.show === 'function') el.show();
    }
  });
  safeExpand('#ccSysError');
  if (specificField && $w(specificField)) {
    $w(specificField).updateValidityIndication?.('INVALID');
  }
  if (autoHideDelay > 0 && !isCritical) {
    setTimeout(() => hideError(), autoHideDelay);
  }
}

function hideError() {
  safeCollapse('#ccSysError');
  if ($w('#ccErrorText')) $w('#ccErrorText').text = '';
  ERROR_P_IDS.forEach(id => safeCollapse(id));
}

// ==================== DEBUG EXPORTS ====================
export function debugTaxonomy() { console.log('[cc-v7.9.0] Taxonomy Cache:', _taxonomyCache); return _taxonomyCache; }
export function debugForceState(stateName) { if ($w('#ccPromotionalAd') && typeof $w('#ccPromotionalAd').changeState === 'function') { $w('#ccPromotionalAd').changeState(stateName); console.log('[cc-v7.9.0] debugForceState: switched to', stateName); } }
export function debugCustomerBase() { return CUSTOMER_BASE_OPTIONS; }
export function debugPainPoints() { return DEFAULT_PAIN_POINTS; }
export function debugSocialMediaPlatforms() { return SOCIAL_MEDIA_PLATFORM_OPTIONS; }
export function debugToneOptions() { return TONE_OPTIONS; }
export function debugNarratorOptions() { return NARRATOR_OPTIONS; }
export function debugCheckboxStates() {
  const states = {
    assetRightsTerms: $w('#ccAssetRightsTerms')?.checked || false,
    contentResultPolicy: $w('#ccContentResultPolicy')?.checked || false,
    contentDeliveryPolicy: $w('#ccContentDeliveyPolicy')?.checked || false,
    allChecked: ($w('#ccAssetRightsTerms')?.checked || false) &&
                ($w('#ccContentResultPolicy')?.checked || false) &&
                ($w('#ccContentDeliveyPolicy')?.checked || false)
  };
  console.log('[cc-v7.9.0] Checkbox States:', states);
  return states;
}
export function debugWebhookStatus() {
  console.log('[cc-v7.9.0] Webhook Statuses:', { main: _mainWebhookStatus, painPoint: _painPointWebhookStatus });
  return { main: _mainWebhookStatus, painPoint: _painPointWebhookStatus };
}
export function debugCollectionStatus() { console.log('[cc-v7.9.0] Collection Status:', { exists: _collectionExists, mainCollection: SUBMISSIONS_COLLECTION, fallbackCollection: SUBMISSIONS_FALLBACK_COLLECTION }); return _collectionExists; }
export function debugBackendStatus() {
  console.log('[cc-v7.9.0] Backend Status:', {
    available: _backendAvailable,
    sendToWebhook: typeof sendToWebhook,
    validateWebhookConnection: typeof validateWebhookConnection,
    validatePainPointWebhook: typeof validatePainPointWebhook,
    getPainPoints: typeof getPainPoints
  });
  return {
    available: _backendAvailable,
    sendToWebhook: typeof sendToWebhook,
    validateWebhookConnection: typeof validateWebhookConnection,
    validatePainPointWebhook: typeof validatePainPointWebhook,
    getPainPoints: typeof getPainPoints
  };
}