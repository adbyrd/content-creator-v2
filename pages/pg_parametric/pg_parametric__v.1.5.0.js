/**
 * IMAGE GENERATOR - 'PARAMETRIC'
 * Page Code
 * version 1.5.0
 */

import { exportImage } from 'backend/parametricService.web';

$w.onReady(function () {
  console.log("[cc-v1.0.0] - Page ready");

  // Hide dropdown initially
  $w('#ccFileMenu').hide();
  console.log("[cc-v1.0.0] - File menu hidden initially");

  // Toggle dropdown on File click
  $w('#ccMenuFile').onClick(() => {
    $w('#ccFileMenu').toggle();
    console.log("[cc-v1.0.0] - File menu toggled");
  });

  // Close dropdown when leaving it
  $w('#ccFileMenu').onMouseLeave(() => {
    $w('#ccFileMenu').hide();
    console.log("[cc-v1.0.0] - File menu hidden (mouse leave)");
  });

  // Close dropdown when other main menus are clicked (Edit, View, Help)
  $w('#ccMenuEdit, #ccMenuView, #ccMenuHelp').onClick(() => {
    $w('#ccFileMenu').hide();
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
    $w(selector).onClick(() => {
      $w('#ccFileMenu').hide();
      console.log(`[cc-v1.0.0] - File menu hidden (option clicked: ${selector})`);
    });
  });

  // Special handling for Export Image – also call backend
  $w('#ccFileExportImage').onClick(() => {
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
  $w('#ccParametric').onClick((event) => {
    const target = event.target;
    const isClickInsideMenu = target.closest('#ccFileMenu');
    const isClickOnFileButton = target.closest('#ccMenuFile');
    if (!isClickInsideMenu && !isClickOnFileButton) {
      $w('#ccFileMenu').hide();
      console.log("[cc-v1.0.0] - File menu hidden (click outside)");
    }
  });
});