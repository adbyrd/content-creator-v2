/**
 * IMAGE GENERATOR - 'PARAMETRIC'
 * Page Code
 * version 1.8.0
 */

import { exportImage, checkWebhookStatus } from 'backend/parametricService.web'; 

$w.onReady(function () { 
  console.log("[cc-v1.0.0] - Page ready"); 

  // Check webhook status on load and log to browser
  checkWebhookStatus()
    .then(status => {
      console.log("[cc-v1.0.0] - Webhook status check:", status);
    })
    .catch(err => {
      console.error("[cc-v1.0.0] - Webhook status check failed:", err);
    });

  // Helper to safely attach events only if element exists
  function safeAttach(selector, eventName, handler) {
    const $el = $w(selector);
    if ($el.length) {
      $el[eventName](handler);
    } else {
      console.warn(`[cc-v1.0.0] - Element not found: ${selector}`);
    }
  }

  // Shorthand for click
  function onClick(selector, handler) {
    safeAttach(selector, 'onClick', handler);
  }

  function hideFileMenu() {
    const $menu = $w('#ccFileMenu');
    if ($menu.length) $menu.hide();
  }

  // Toggle dropdown on File click
  onClick('#ccMenuFile', () => {
    $w('#ccFileMenu').toggle();
    console.log("[cc-v1.0.0] - File menu toggled");
  });

  // Close dropdown when mouse leaves the menu
  const $fileMenu = $w('#ccFileMenu');
  if ($fileMenu.length) {
    $fileMenu.onMouseLeave(() => {
      hideFileMenu();
      console.log("[cc-v1.0.0] - File menu hidden (mouse leave)");
    });
  } else {
    console.warn("[cc-v1.0.0] - #ccFileMenu not found for mouse leave");
  }

  // Close dropdown when other main menus are clicked (Edit, View, Help)
  onClick('#ccMenuEdit, #ccMenuView, #ccMenuHelp', () => {
    hideFileMenu();
    console.log("[cc-v1.0.0] - File menu hidden (other main menu clicked)");
  });

  // Handle clicks on any menu option (they should hide the menu)
  const menuOptions = [
    '#ccFileNewImage',
    '#ccFileNewVideo',
    '#ccFileExportImage',
    '#ccFileExportVideo',
    '#ccFileOpen'
  ];

  menuOptions.forEach(selector => {
    onClick(selector, () => {
      hideFileMenu();
      console.log(`[cc-v1.0.0] - File menu hidden (option clicked: ${selector})`);
    });
  });

  // Special handling for Export Image – also call backend
  onClick('#ccFileExportImage', () => {
    console.log("[cc-v1.0.0] - Export Image button clicked, calling backend...");
    exportImage()
      .then(result => {
        console.log("[cc-v1.0.0] - Backend exportImage succeeded:", result);
        // Optionally show user feedback
      })
      .catch(error => {
        console.error("[cc-v1.0.0] - Backend exportImage failed:", error);
      });
  });

  // Close dropdown when clicking anywhere else on the page
  // Use the page container (assumed to have id #ccParametric)
  onClick('#ccParametric', (event) => {
    const target = event.target;
    // Use Wix's closest method if available
    const isClickInsideMenu = target.closest ? target.closest('#ccFileMenu') : false;
    const isClickOnFileButton = target.closest ? target.closest('#ccMenuFile') : false;
    if (!isClickInsideMenu && !isClickOnFileButton) {
      hideFileMenu();
      console.log("[cc-v1.0.0] - File menu hidden (click outside)");
    }
  });
});