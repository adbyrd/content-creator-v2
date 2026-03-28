/**
 * NEW PROJECT WIZARD LIGHTBOX
 * Handles multi-step project creation and validation.
 * @version 1.0.0
 */

import wixWindow from 'wix-window';
import { upsertProject } from 'backend/projects.web';

const VERSION_TAG = '[ccNewProjectPopup-v1.0.0]';
const MSB_ID = '#ccSetUpNewProject';
const STEP_STATE_IDS = ['ccNewProjectSummary', 'ccNewProjectStrategy']; // 
const MSG_VALIDATION_ERROR = "Please fill in all required fields before proceeding.";
const MSG_GENERIC_ERROR = "Something went wrong. Please try again.";

let currentStepIndex = 0;
let isSubmitting = false;

$w.onReady(() => {
    console.log(`${VERSION_TAG} Wizard Initialized`);
    bootUI();
    wireWizardHandlers();
});

function bootUI() {
    safeHide('#ccSave');
    $w('#ccNext').enable();
    $w('#ccLightboxHeading').text = "New Project: Step 1";
}

function wireWizardHandlers() {
    $w('#ccNext').onClick(() => handleNavigation(1));
    $w('#ccCancel').onClick(() => wixWindow.lightbox.close({ success: false }));
    $w('#ccSave').onClick(() => handleSubmission());
}

async function handleNavigation(direction) {
    const nextIndex = currentStepIndex + direction;

    if (direction > 0 && !validateStep(currentStepIndex)) {
        showError(MSG_VALIDATION_ERROR);
        return;
    }

    if (nextIndex >= 0 && nextIndex < STEP_STATE_IDS.length) {
        currentStepIndex = nextIndex;
        const stateName = STEP_STATE_IDS[currentStepIndex];
        
        $w(MSB_ID).changeState(stateName);
        updateNavigationUI();
    }
}

function updateNavigationUI() {
    const isLastStep = currentStepIndex === STEP_STATE_IDS.length - 1;

    if (isLastStep) {
        $w('#ccNext').hide();
        $w('#ccSave').show();
        $w('#ccLightboxHeading').text = "New Project: Final Step";
    } else {
        $w('#ccNext').show();
        $w('#ccSave').hide();
        $w('#ccLightboxHeading').text = `New Project: Step ${currentStepIndex + 1}`;
    }
}

function validateStep(index) {
    if (index === 0) {
        return $w('#ccNewProjectName').valid && $w('#ccNewProjectDescription').valid;
    }
    return true;
}

async function handleSubmission() {
    if (isSubmitting) return;

    isSubmitting = true;
    toggleLoading(true);

    const payload = {
        projectName: $w('#ccNewProjectName').value,
        description: $w('#ccNewProjectDescription').value,
        goal: $w('#ccProjectGoal').value,
        offer: $w('#ccProjectOffer').value,
        misconception: $w('#ccProjectMisconception').value,
        targetAudience: $w('#ccProjectAudience').value
    };

    try {
        const response = await upsertProject(payload);

        if (response.ok) {
            console.log(`${VERSION_TAG} Project Saved. RequestId: ${response.requestId}`); // [cite: 32]
            wixWindow.lightbox.close({ success: true, projectId: response.data._id }); // [cite: 87, 88]
        } else {
            throw new Error(response.error.message);
        }
    } catch (err) {
        console.error(`${VERSION_TAG} Submission Failed:`, err);
        showError(MSG_GENERIC_ERROR);
    } finally {
        isSubmitting = false;
        toggleLoading(false);
    }
}

// --- Helper Functions ---

function safeHide(selector) {
    const el = $w(selector);
    if (el) el.hide();
}

function toggleLoading(active) {
    if (active) {
        $w('#ccSave').disable();
        $w('#ccCancel').disable();
    } else {
        $w('#ccSave').enable();
        $w('#ccCancel').enable();
    }
}

function showError(message) {
    console.warn(`${VERSION_TAG} Validation Alert: ${message}`);
    const errEl = $w('#ccGeneralError'); 
    if (errEl) {
        errEl.text = message;
        errEl.show();
    }
}