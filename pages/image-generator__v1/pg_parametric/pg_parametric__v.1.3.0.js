/**
 * IMAGE GENERATOR - 'PARAMETRIC'
 * version 1.3.0
 * 
 * Updates:
 * - Use wix-secrets (frontend) for webhook URL retrieval
 * - Suppress onMouseLeave type error with @ts-ignore (runtime works)
 * - Dropdown toggle with explicit show/hide and state flag
 * - Webhook payload sent via fetch
 */

import { fetch } from 'wix-fetch';
import wixSecrets from 'wix-secrets'; // Use frontend secrets module

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

  // Close dropdown when mouse leaves the menu area
  // @ts-ignore – onMouseLeave is valid at runtime despite type definition
  $w('#ccFileMenu').onMouseLeave(() => {
    $w('#ccFileMenu').hide();
    isFileMenuVisible = false;
  });

  // Close dropdown when other main menu buttons are clicked
  $w('#ccEditFile, #ccViewFile, #ccHelpFile').onClick(() => {
    $w('#ccFileMenu').hide();
    isFileMenuVisible = false;
  });

  // Handle Export Image click – retrieve webhook URL from Secrets Manager
  $w('#ccFileExportImage').onClick(async () => {
    try {
      // Fetch the webhook URL from Wix Secrets Manager
      const webhookUrl = await wixSecrets.getSecret('CC_WEBHOK_EXPORT_IMAGE');

      const payload = {
        action: 'export_image',
        timestamp: new Date().toISOString(),
        // Add any dynamic parameters here (e.g., current image settings)
      };

      const response = await fetch(webhookUrl, {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log('Webhook sent successfully');
        // Optional: show a success message to the user
        // $w('#statusMessage').text = 'Export started!';
      } else {
        console.error('Webhook error', response.status);
      }
    } catch (error) {
      console.error('Failed to call webhook or retrieve secret', error);
      // Optional: show error message to user
    }
  });
});