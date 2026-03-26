/**
 * PROJECT MANAGEMENT PAGE
 * @version 1.2.0
 * @updated 2026-03-25
 */

import wixLocation from 'wix-location';
import { getProjects } from 'backend/projects.web';

// Constants
const VERSION_TAG = '[projects-v1.1.0]';
const PAGE_SIZE = 10;
const MSG_LOAD_ERROR = 'We encountered an issue loading your projects. Please try refreshing.';

// Internal State
let _projectsCache = [];

$w.onReady(async function () {
    console.log(`${VERSION_TAG} Page Initialization Started`);
    
    bootUI();
    wireHandlers();
    await hydrateProjects();
});

/**
 * 4.1 Initialization: Bootstrap the UI state
 */
function bootUI() {
    safeHide('#projectsTable');
    safeHide('#emptyStateContainer');
    safeHide('#ccGeneralError');
    
    const loader = $w('#ccLoadingIndicator');
    if (loader && typeof loader.show === 'function') loader.show();
}

/**
 * 4.1 Initialization: Set up event handlers
 */
function wireHandlers() {
    // New Project Action
    $w('#btnNewProject').onClick(() => {
        console.log(`${VERSION_TAG} Action: New Project clicked`);
        wixLocation.to('/new-project-wizard');
    });

    // Table Navigation Action
    $w('#projectsTable').onRowSelect((event) => {
        const projectId = event.rowData._id;
        console.log(`${VERSION_TAG} Action: Row selected [${projectId}]`);
        wixLocation.to(`/projects/edit/${projectId}`);
    });
}

/**
 * 4.6 Data Hydration
 */
async function hydrateProjects() {
    try {
        const result = await getProjects({ limit: PAGE_SIZE });

        if (result.ok) {
            _projectsCache = result.data;
            if (_projectsCache.length > 0) {
                renderProjectsTable(_projectsCache);
            } else {
                showEmptyState();
            }
        } else {
            throw new Error(result.error?.message || 'Data retrieval failed');
        }
    } catch (err) {
        console.error(`${VERSION_TAG} Hydration Error:`, err.message);
        showError(MSG_LOAD_ERROR);
        showEmptyState();
    } finally {
        safeHide('#ccLoadingIndicator');
    }
}

/**
 * UI Rendering logic for the table
 */
function renderProjectsTable(data) {
    const table = $w('#projectsTable');
    
    table.columns = [
        { id: 'colName', dataPath: 'projectName', label: 'Project Name', type: 'string' }
    ];
    
    table.rows = data;
    safeShow('#projectsTable');
    safeHide('#emptyStateContainer');
}

function showEmptyState() {
    safeHide('#projectsTable');
    safeShow('#emptyStateContainer');
}

/**
 * 7. Centralized Error Messaging
 */
function showError(message) {
    const errorEl = $w('#ccGeneralError');
    if (errorEl && typeof errorEl.show === 'function') {
        errorEl.text = message;
        errorEl.show();
    }
}

// --- 4.3 Safe UI Helpers (Standardized Defensive Programming) ---

function safeShow(selector) {
    const el = $w(selector);
    if (el && typeof el.show === 'function') {
        el.show();
    } else {
        console.warn(`${VERSION_TAG} safeShow: ${selector} missing or unsupported.`);
    }
}

function safeHide(selector) {
    const el = $w(selector);
    if (el && typeof el.hide === 'function') {
        el.hide();
    } else {
        console.warn(`${VERSION_TAG} safeHide: ${selector} missing or unsupported.`);
    }
}