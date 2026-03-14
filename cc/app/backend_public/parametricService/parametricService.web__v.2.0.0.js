/**
 * 'PARAMETRIC' IMAGE GENERATOR v.2 (adbyrd.com/cc)
 * [ BACKEND SERVICE ] 'EXPORT' & 'STATUS CHECK'
 * version 2.0.0
 */

import { fetch } from 'wix-fetch';
import { getSecret } from 'wix-secrets-backend';
import { webMethod, Permissions } from 'wix-web-module';

// 👇 This log MUST appear in Velo Monitoring if the file loads
console.log('[parametricService] Module loaded – version 1.4.0');

// Helper to safely retrieve secrets
async function getSecrets() {
  try {
    const webhookUrl = await getSecret('CC_EXPORT_IMAGE');
    const clientId = await getSecret('CLIENT_ID');
    const clientSecret = await getSecret('CLIENT_SECRET');
    const projectId = await getSecret('PROJECT_ID');

    console.log('[parametricService] Secrets retrieved:', {
      webhookUrl: webhookUrl ? 'present' : 'missing',
      clientId: clientId ? 'present' : 'missing',
      clientSecret: clientSecret ? 'present' : 'missing',
      projectId: projectId ? 'present' : 'missing'
    });

    return { webhookUrl, clientId, clientSecret, projectId };
  } catch (error) {
    console.error('[parametricService] Secret retrieval failed:', error.message);
    throw new Error(`Secret retrieval failed: ${error.message}`);
  }
}

// Export the main image generation function
export const exportImage = webMethod(Permissions.Anyone, async () => {
  console.log('[cc-v1.0.0] - Backend: exportImage called');
  try {
    const { webhookUrl, clientId, clientSecret, projectId } = await getSecrets();

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

    console.log('[cc-v1.0.0] - Backend: Payload prepared');

    const response = await fetch(webhookUrl, {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log(`[cc-v1.0.0] - Backend: Webhook response status ${response.status}`);

    if (response.ok) {
      const responseText = await response.text();
      console.log('[cc-v1.0.0] - Backend: Webhook succeeded');
      return { success: true, status: response.status, body: responseText };
    } else {
      const errorText = await response.text();
      console.error('[cc-v1.0.0] - Backend: Webhook error', response.status, errorText);
      throw new Error(`Webhook responded with ${response.status}: ${errorText}`);
    }
  } catch (error) {
    console.error('[cc-v1.0.0] - Backend: Exception in exportImage', error);
    throw error;
  }
});

// Export the status check function
export const checkWebhookStatus = webMethod(Permissions.Anyone, async () => {
  console.log('[cc-v1.0.0] - Backend: checkWebhookStatus called');
  const status = {
    configured: false,
    details: null,
    error: null,
    lastCheck: new Date().toISOString(),
    ready: false,
    testPassed: false
  };

  try {
    const { webhookUrl, clientId, clientSecret, projectId } = await getSecrets();

    status.configured = true;
    status.details = {
      webhookUrl: webhookUrl ? 'present' : 'missing',
      clientId: clientId ? 'present' : 'missing',
      clientSecret: clientSecret ? 'present' : 'missing',
      projectId: projectId ? 'present' : 'missing'
    };

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
      const errorText = await response.text();
      status.details = { ...status.details, responseError: errorText.substring(0, 200) };
    }
  } catch (error) {
    status.error = error.message;
  }

  console.log('[cc-v1.0.0] - Backend: checkWebhookStatus result', status);
  return status;
});