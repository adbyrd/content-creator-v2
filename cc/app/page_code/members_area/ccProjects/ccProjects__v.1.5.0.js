/**
 * PROJECT MANAGEMENT PAGE
 * Multi-State Wizard & CRUD Interface
 * @version 1.5.0
 * @updated 2026-03-26
 */

import wixLocation from 'wix-location';
import { upsertProject } from 'backend/projects.web';

const VERSION_TAG = '[ccProjects-v1.5.0]';
const MSG_SAVE_SUCCESS = "Success! Your project has been saved.";
const MSG_SAVE_ERROR = "We couldn't save your project. Please check your connection.";

const MSB_ID = '#projectWizardStateBox';
const STATES = {
    BASIC_INFO: 'basicInfo',
    GOALS_OFFER: 'goalsOffer',
    AUDIENCE: 'audience'
};

$w.onReady(function () {
    console.log(`${VERSION_TAG} Page Initialization Started`);
    
    initUI();
    checkSaveStatus(); // Check if we just redirected here after a successful save
    wireWizardHandlers();
});

/**
 * Checks URL parameters for success flags to trigger the toaster
 */
function checkSaveStatus() {
    const query = wixLocation.query;
    if (query.saveSuccess === 'true') {
        showSuccessToaster();
        // Clean up URL without refreshing the page
        wixLocation.queryParams.remove(['saveSuccess']);
    }
}

function initUI() {
    $w('#ccSuccessToaster').hide();
    $w('#ccLoadingIndicator').hide();
    $w('#ccGeneralError').hide();
}

function wireWizardHandlers() {
    // Navigation: Next Buttons
    $w('#btnNextToStep2').onClick(() => $w(MSB_ID).changeState(STATES.GOALS_OFFER));
    $w('#btnNextToStep3').onClick(() => $w(MSB_ID).changeState(STATES.AUDIENCE));
    
    // Navigation: Back Buttons
    $w('#btnBackToStep1').onClick(() => $w(MSB_ID).changeState(STATES.BASIC_INFO));
    $w('#btnBackToStep2').onClick(() => $w(MSB_ID).changeState(STATES.GOALS_OFFER));

    // Final Save Action
    $w('#btnSaveProject').onClick(async () => {
        await handleProjectSubmission();
    });
}

/**
 * Aggregates data from MSB and calls the backend service
 */
async function handleProjectSubmission() {
    const saveBtn = $w('#btnSaveProject');
    const loader = $w('#ccLoadingIndicator');

    // 1. Prevent concurrent submissions
    saveBtn.disable();
    loader.show();
    $w('#ccGeneralError').hide();

    // 2. Build Payload (Mapping UI inputs to Backend Contract)
    const projectPayload = {
        projectId: $w('#inputProjectId').value || null, // Present if editing existing
        projectName: $w('#inputProjectName').value,
        description: $w('#inputDescription').value,
        goal: $w('#inputGoal').value,
        offer: $w('#inputOffer').value,
        misconception: $w('#inputMisconception').value,
        targetAudience: $w('#inputTargetAudience').value
    };

    try {
        const response = await upsertProject(projectPayload);

        if (response.ok) {
            console.log(`${VERSION_TAG} Save Successful. RequestId: ${response.requestId}`);
            const targetPath = `/projects/edit/${response.data._id}`;
            wixLocation.to(`${targetPath}?saveSuccess=true`);
        } else {
            throw new Error(response.error.message);
        }
    } catch (err) {
        console.error(`${VERSION_TAG} Submission Error:`, err.message);
        showError(MSG_SAVE_ERROR);
        saveBtn.enable();
    } finally {
        loader.hide();
    }
}

// --- UI Feedback Helpers ---

function showSuccessToaster() {
    const toaster = $w('#ccSuccessToaster');
    $w('#ccToasterMessage').text = MSG_SAVE_SUCCESS;
    
    toaster.show('fade', { duration: 300 });
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (toaster.isVisible) toaster.hide('fade');
    }, 5000);
}

function showError(message) {
    const errorEl = $w('#ccGeneralError');
    errorEl.text = message;
    errorEl.show();
}