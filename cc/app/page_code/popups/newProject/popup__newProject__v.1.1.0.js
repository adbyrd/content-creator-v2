/**
 * NEW PROJECT WIZARD LIGHTBOX
 * Handles multi-step project creation and validation.
 * @version 1.1.0
 */

import wixWindow from 'wix-window';
import { currentMember } from 'wix-members-frontend';
import { upsertProject } from 'backend/projects.web';

const VERSION_TAG = '[ccNewProjectPopup-v1.1.0]';
const MSB_ID = '#ccSetUpNewProject';
const STEP_STATE_IDS = ['ccNewProjectSummary', 'ccNewProjectStrategy']; 
const MSG_VALIDATION_ERROR = "Please fill in all required fields before proceeding.";
const MSG_GENERIC_ERROR = "Something went wrong. Please try again.";
const MSG_AUTH_ERROR = "You must be logged in to create a project.";

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
        $w(MSB_ID).changeState(STEP_STATE_IDS[currentStepIndex]);
        updateNavigationUI();
    }
}

function updateNavigationUI() {
    if (currentStepIndex === STEP_STATE_IDS.length - 1) {
        safeHide('#ccNext');
        safeShow('#ccSave');
    } else {
        safeShow('#ccNext');
        safeHide('#ccSave');
    }
    $w('#ccLightboxHeading').text = `New Project: Step ${currentStepIndex + 1}`;
}

async function handleSubmission() {
    if (isSubmitting) return;
    
    try {
        isSubmitting = true;
        toggleLoading(true);

        const member = await currentMember.getMember();
        if (!member) throw new Error(MSG_AUTH_ERROR);

        const payload = {
            memberId: member.loginEmail,
            projectName: $w('#ccNewProjectName').value,
            projectDescription: $w('#ccNewProjectDescription').value,
            projectGoal: $w('#ccProjectGoal').value,
            projectOffer: $w('#ccProjectOffer').value,
            projectMisconception: $w('#ccProjectMisconception').value,
            targetAudience: $w('#ccProjectAudience').value
        };

        const response = await upsertProject(payload);

        if (response.ok) {
            console.log(`${VERSION_TAG} Project Saved. ID: ${response.data._id}`);
            wixWindow.lightbox.close({ success: true });
        } else {
            throw new Error(response.error.message);
        }

    } catch (err) {
        console.error(`${VERSION_TAG} Submission Failed:`, err);
        showError(err.message || MSG_GENERIC_ERROR);
    } finally {
        isSubmitting = false;
        toggleLoading(false);
    }
}

// --- Standards-Based Helpers ---

function validateStep(index) {
    if (index === 0) {
        return $w('#ccNewProjectName').valid && $w('#ccNewProjectDescription').valid;
    }
    return true;
}

function safeHide(selector) {
    const el = $w(selector);
    if (el) el.hide();
}

function safeShow(selector) {
    const el = $w(selector);
    if (el) el.show();
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
    const errEl = $w('#ccStepError');
    if (errEl) {
        errEl.text = message;
        errEl.expand();
    }
}