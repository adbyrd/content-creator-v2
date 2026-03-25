/**
 * CC PROJECT MANAGEMENT PAGE
 * @version 1.0.1
 * @updated 2026-03-24
 */

import wixLocation from 'wix-location';
import { getProjects } from 'backend/projects.web';

// Constants
const VERSION_TAG = '[projects-v1.0.0]';
const PAGE_SIZE = 10;
const MSG_LOAD_ERROR = 'We encountered an issue loading your projects. Please try refreshing.';

// State Management
let _projectsCache = [];
let _totalCount = 0;

$w.onReady(async function () {
    console.log(`${VERSION_TAG} Initializing Projects page...`); 
    
    bootUI();
    wireHandlers();
    await hydrateProjectsWithRetry();
});

/**
 * 4.1 Initialization: Bootstrap the UI
 */
function bootUI() {
    safeHide('#projectsTable'); 
    safeHide('#emptyStateContainer');
    $w('#ccLoadingIndicator').show(); 
}

/**
 * 4.1 Initialization: Set up event handlers
 */
function wireHandlers() {
    // New Project Button
    $w('#btnNewProject').onClick(() => {
        console.log(`${VERSION_TAG} Action: btnNewProject clicked`);
        wixLocation.to('/new-project-wizard'); 
    });

    // Table Row Action (Navigation to Edit) 
    $w('#projectsTable').onRowSelect((event) => {
        const projectId = event.rowData._id;
        console.log(`${VERSION_TAG} Action: Row selected, ID: ${projectId}`);
        wixLocation.to(`/projects/edit/${projectId}`);
    });
}

/**
 * 4.6 Dynamic Data Loading with Retries
 */
async function hydrateProjectsWithRetry() {
    try {
        // Calls backend module which handles internal retries and timeouts
        const result = await getProjects({ limit: PAGE_SIZE, sort: 'projectName' });
        
        if (result.ok && result.data && result.data.length > 0) {
            _projectsCache = result.data;
            _totalCount = result.totalCount || result.data.length;
            renderProjectsTable(_projectsCache);
        } else if (result.ok && result.data.length === 0) {
            console.log(`${VERSION_TAG} No projects found for user.`);
            showEmptyState();
        } else {
            throw new Error(result.error?.message || 'Unknown retrieval error');
        }
    } catch (err) {
        console.error(`${VERSION_TAG} hydrateProjectsWithRetry failed:`, err);
        showError(MSG_LOAD_ERROR);
        showEmptyState(); 
    } finally {
        $w('#ccLoadingIndicator').hide();
    }
}

/**
 * Renders the table and handles visibility logic
 */
function renderProjectsTable(data) {
    const table = $w('#projectsTable');
    
    // Decouple UI from data shape via normalization if necessary
    table.columns = [
        { id: 'colName', dataPath: 'projectName', label: 'Project Name', type: 'string' }
    ];
    
    table.rows = data;
    safeShow('#projectsTable'); 
    safeHide('#emptyStateContainer'); 
}

/**
 * Displays the placeholder when no data exists
 */
function showEmptyState() {
    safeHide('#projectsTable'); 
    safeShow('#emptyStateContainer'); 
}

/**
 * 7. Centralized Error Communication
 */
function showError(message) {
    // Assumes a general error text element exists on page
    const errorEl = $w('#ccGeneralError');
    if (errorEl && typeof errorEl.show === 'function') {
        errorEl.text = message;
        errorEl.show();
    }
}

// --- 4.3 Safe UI Manipulation Helpers (Fixes log TypeError) ---

function safeShow(selector) {
    const el = $w(selector);
    // Check existence AND that it is a UI element with a show method
    if (el && typeof el.show === 'function') {
        el.show(); 
    } else {
        console.warn(`${VERSION_TAG} safeShow: ${selector} missing or unsupported.`);
    }
}

function safeHide(selector) {
    const el = $w(selector);
    // Check existence AND that it is a UI element with a hide method
    if (el && typeof el.hide === 'function') {
        el.hide(); 
    } else {
        console.warn(`${VERSION_TAG} safeHide: ${selector} missing or unsupported.`);
    }
}

// --- 4.10 Debug Exports  ---

export function debugPageState() {
    console.log(`${VERSION_TAG} DEBUG STATE:`, {
        _projectsCache,
        _totalCount,
        currentUrl: wixLocation.url
    });
}