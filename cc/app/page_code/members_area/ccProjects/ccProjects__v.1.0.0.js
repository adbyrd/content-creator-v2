/**
 * CC PROJECTS
 * @version 1.0.0
 * @updated 2026-03-24
 */

import wixData from 'wix-data';
import wixLocation from 'wix-location';
import { getProjects } from 'backend/projects.web';

// Constants 
const VERSION_TAG = '[projects-v1.0.0]';
const PROJECTS_COLLECTION = 'Projects';
const PAGE_SIZE = 10;

// State Management 
let _projectsCache = [];
let _totalCount = 0;

$w.onReady(async function () {
    console.log(`${VERSION_TAG} Initializing Projects page...`); 
    
    await bootUI(); 
    wireHandlers(); 
    await loadProjectsWithRetry(); 
});

/**
 * Sets initial UI state 
 */
async function bootUI() {
    safeHide('#projectsTable'); 
    safeHide('#emptyStateContainer');
    $w('#ccLoadingIndicator').show(); 
}

/**
 * Binds event handlers to UI elements 
 */
function wireHandlers() {
    // New Project Button
    $w('#btnNewProject').onClick(() => {
        console.log(`${VERSION_TAG} Navigating to New Project wizard`);
        wixLocation.to('/new-project-wizard'); 
    });

    // Table Row Action (Navigation to Edit) 
    $w('#projectsTable').onRowSelect((event) => {
        const projectId = event.rowData._id;
        wixLocation.to(`/projects/edit/${projectId}`);
    });
}

/**
 * Loads project data with defensive error handling 
 */
async function loadProjectsWithRetry() {
    try {
        // Using backend method to adhere to retry/timeout standards
        const result = await getProjects({ limit: PAGE_SIZE, sort: 'projectName' });
        
        if (result.ok && result.data.length > 0) {
            _projectsCache = result.data;
            renderProjectsTable(_projectsCache);
        } else {
            showEmptyState();
        }
    } catch (err) {
        console.error(`${VERSION_TAG} Failed to load projects:`, err);
        showEmptyState(); // Fallback to empty state/error UI 
    } finally {
        $w('#ccLoadingIndicator').hide();
    }
}

/**
 * Renders the table and handles visibility logic 
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

/**
 * Displays the "Create A New Project" placeholder 
 */
function showEmptyState() {
    safeHide('#projectsTable'); 
    safeShow('#emptyStateContainer'); 
}

// --- UI Helper Functions (Defensive Programming)  ---

function safeShow(selector) {
    const el = $w(selector);
    if (el) el.show(); 
}

function safeHide(selector) {
    const el = $w(selector);
    if (el) el.hide(); 
}