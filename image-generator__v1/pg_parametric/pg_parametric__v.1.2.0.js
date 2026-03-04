/**
 * IMAGE GENERATOR - 'PARAMETRIC'
 * version 1.2.0
 * 
 * Updates:
 * - Replaced onMouseLeave with onMouseOut + child check
 * - Dropdown toggle using explicit show/hide
 * - Webhook URL fetched from Secrets Manager
 */

import { fetch } from 'wix-fetch';
import wixSecrets from 'wix-secrets-backend'; // Adjust if using frontend secrets

$w.onReady(function () {
  let isFileMenuVisible = false;

  // Initially hide the dropdown
  $w('#ccFileMenu').hide();

  // Toggle dropdown on File click
  $w('#ccMenuFile').onClick(() => {
    if (isFileMenuVisible) {
      $w('#ccFileMenu').hide();
    } else {
      $w('#ccFileMenu').show();
    }
    isFileMenuVisible = !isFileMenuVisible;
  });

  /**
   * Close dropdown when mouse leaves the menu area,
   * but not if moving to a child element.
   * onMouseOut fires when leaving the element OR moving to a child.
   * We check if the new related target is still inside the menu.
   */
  $w('#ccFileMenu').onMouseOut((event) => {
    const menuElement = $w('#ccFileMenu').getNativeElement(); // Get the actual DOM node
    const relatedTarget = event.relatedTarget; // The element the mouse moved to

    // If relatedTarget is null (e.g., moved to browser chrome) or is outside menu, hide it
    if (!relatedTarget || !menuElement.contains(relatedTarget)) {
      $w('#ccFileMenu').hide();
      isFileMenuVisible = false;
    }
  });

  // Close dropdown when other main menu buttons are clicked
  $w('#ccEditFile, #ccViewFile, #ccHelpFile').onClick(() => {
    $w('#ccFileMenu').hide();
    isFileMenuVisible = false;
  });

  // Handle Export Image click – retrieve webhook URL from Secrets Manager
  $w('#ccFileExportImage').onClick(async () => {
    try {
      const webhookUrl = await wixSecrets.getSecret('CC_WEBHOK_EXPORT_IMAGE');

      const payload = {
        action: 'export_image',
        timestamp: new Date().toISOString(),
        // Add any dynamic parameters here
      };

      const response = await fetch(webhookUrl, {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log('Webhook sent successfully');
        // Optional: show success message
      } else {
        console.error('Webhook error', response.status);
      }
    } catch (error) {
      console.error('Failed to call webhook or retrieve secret', error);
    }
  });
});