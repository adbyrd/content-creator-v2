/**
 * IMAGE GENERATOR - 'PARAMETRIC'
 * Backend Service
 * version 1.2.0
 */

import { fetch } from 'wix-fetch';
import { getSecret } from 'wix-secrets-backend';

/**
 * Sends the export image payload to the n8n webhook.
 * @returns {Promise<Object>} - Result of the webhook call.
 */
export async function exportImage() {
  console.log("[cc-v1.0.0] - Backend: exportImage called");

  try {
    const webhookUrl = await getSecret('CC_WEBHOOK_EXPORT_IMAGE');
    const clientId = await getSecret('CLIENT_ID');
    const clientSecret = await getSecret('CLIENT_SECRET');
    const projectId = await getSecret('PROJECT_ID');

    console.log("[cc-v1.0.0] - Backend: Secrets retrieved");

    const payload = [
      {
        "authorization-url": "https://accounts.google.com/o/oauth2/auth",
        "access-token-url": "https://oauth2.googleapis.com/token",
        "client-id": clientId,
        "client-secret": clientSecret,
        "scope": "https://www.googleapis.com/auth/cloud-platform",
        "grant-type": "Authorization Code",
        "state": "",
        "region": "us-south1",
        "project-id": projectId,
        "location": "us-south1",
        "model-4": "imagen-4.0-generate-001",
        "action": "predict",
        "prompt": "A weathered investigative journalist in a rumpled trench coat flips open a small spiral notebook while speaking into a chunky 1990s handheld tape recorder, expression focused and determined, subtle cigarette smoke curling upward. Standing on a rain-slicked downtown city sidewalk at night, neon diner signs reflecting across wet pavement, light fog drifting through the street, distant headlights creating glowing halos in the mist, urban grit and late-night newsroom urgency in the atmosphere. Shot on an IMAX large-format virtual camera, f/2.8 aperture for cinematic shallow depth of field, eye-level medium shot, natural perspective, ultra-detailed textures in clothing fibers and raindrops, subtle film grain simulation. Authentic 1990s analog film aesthetic, Kodak-style color science, sodium-vapor streetlights mixed with neon bounce lighting, soft halation around highlights, natural contrast, slightly desaturated urban palette with warm practical lights and cool night shadows."
      }
    ];

    console.log("[cc-v1.0.0] - Backend: Payload prepared", JSON.stringify(payload, null, 2));

    const response = await fetch(webhookUrl, {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log(`[cc-v1.0.0] - Backend: Webhook response status ${response.status}`);

    if (response.ok) {
      const responseText = await response.text();
      console.log("[cc-v1.0.0] - Backend: Webhook succeeded", responseText);
      return { success: true, status: response.status, body: responseText };
    } else {
      const errorText = await response.text();
      console.error("[cc-v1.0.0] - Backend: Webhook error", response.status, errorText);
      throw new Error(`Webhook responded with ${response.status}: ${errorText}`);
    }
  } catch (error) {
    console.error("[cc-v1.0.0] - Backend: Exception in exportImage", error);
    throw error;
  }
}

/**
 * Checks the status of the webhook connection.
 * Retrieves secrets and attempts a lightweight test call.
 * @returns {Promise<Object>} - Status object with configured, error, lastCheck, ready, testPassed.
 */
export async function checkWebhookStatus() {
  console.log("[cc-v1.0.0] - Backend: checkWebhookStatus called");
  const status = {
    configured: false,
    details: null,
    error: null,
    lastCheck: new Date().toISOString(),
    ready: false,
    testPassed: false
  };

  try {
    // Attempt to retrieve all required secrets
    const webhookUrl = await getSecret('CC_WEBHOOK_EXPORT_IMAGE');
    const clientId = await getSecret('CLIENT_ID');
    const clientSecret = await getSecret('CLIENT_SECRET');
    const projectId = await getSecret('PROJECT_ID');

    // If we reach here, secrets are configured
    status.configured = true;
    status.details = {
      webhookUrl: webhookUrl ? 'present' : 'missing',
      clientId: clientId ? 'present' : 'missing',
      clientSecret: clientSecret ? 'present' : 'missing',
      projectId: projectId ? 'present' : 'missing'
    };

    // Lightweight test: send a minimal payload to the webhook
    const testPayload = [{ test: true, action: 'status_check' }];
    const response = await fetch(webhookUrl, {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });

    if (response.ok) {
      status.ready = true;
      status.testPassed = true;
    } else {
      status.error = `Webhook responded with status ${response.status}`;
      status.ready = false;
      status.testPassed = false;
    }
  } catch (error) {
    status.error = error.message;
    status.ready = false;
    status.testPassed = false;
  }

  console.log("[cc-v1.0.0] - Backend: checkWebhookStatus result", status);
  return status;
}