/**
 * IMAGE GENERATOR - 'PARAMETRIC'
 * version 1.0.0
 */

import { fetch } from 'wix-fetch';

$w.onReady(function () {
  // Hide dropdown initially
  $w('#ccFileMenu').hide();

  // Toggle dropdown on File click
  $w('#ccMenuFile').onClick(() => {
    $w('#ccFileMenu').toggle();
  });

  // Close dropdown when leaving it
  $w('#ccFileMenu').onMouseLeave(() => {
    $w('#ccFileMenu').hide();
  });

  // Close dropdown when other main menus are clicked
  $w('#ccEditFile, #ccViewFile, #ccHelpFile').onClick(() => {
    $w('#ccFileMenu').hide();
  });

  // Handle Export Image click
  $w('#ccFileExportImage').onClick(() => {
    const payload = {
      action: 'export_image',
      timestamp: new Date().toISOString(),
      // additional data can be added here
    };

    const webhookUrl = 'CC_WEBHOK_EXPORT_IMAGE';

    fetch(webhookUrl, {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    .then(response => {
      if (response.ok) {
        console.log('Webhook sent successfully');
        // Optional user feedback
      } else {
        console.error('Webhook error', response.status);
      }
    })
    .catch(error => {
      console.error('Fetch failed', error);
    });
  });
});