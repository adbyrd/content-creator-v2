/**
 * Company Details Popup
 * @version 1.0.0
 * 
 * Content Creator 2.0 
 */

import wixWindowFrontend from 'wix-window-frontend';
import { saveMemberBusinessProfile } from 'backend/memberData.web';

$w.onReady(function () {
    const context = wixWindowFrontend.lightbox.getContext();
    bootUI(context);

    $w('#btnCancel').onClick(() => wixWindowFrontend.lightbox.close(false));

    $w('#btnSave').onClick(async () => {
        if (validate()) {
            $w('#btnSave').disable();
            $w('#btnSave').label = "Saving...";

            const payload = {
                ccComanyName: $w('#iptCompanyName').value,
                ccCompanyURL: $w('#iptCompanyURL').value,
                ccComanyDescription: $w('#iptCompanyDescription').value,
                ccComanyZipCode: $w('#iptZipCode').value
            };

            try {
                await saveMemberBusinessProfile(payload);
                wixWindowFrontend.lightbox.close(true);
            } catch (err) {
                console.error("[cc-popupCompany-v1.0.0] Save failed", err);
                $w('#btnSave').enable();
                $w('#btnSave').label = "Save";
            }
        }
    });
});

function bootUI(context) {
    if (context) {
        $w('#iptCompanyName').value = context.ccComanyName || "";
        $w('#iptCompanyURL').value = context.ccCompanyURL || "";
        $w('#iptCompanyDescription').value = context.ccComanyDescription || "";
        $w('#iptZipCode').value = context.ccComanyZipCode || "";
    }
}

function validate() {
    // Basic validation: Name and URL required
    return $w('#iptCompanyName').valid && $w('#iptCompanyURL').valid;
}