/**
 * Company Brand Popup
 * Handles file selection, upload progress, and previewing the company logo.
 * @version 1.0.0
 * 
 * Content Creator 2.0 
 */

import wixWindowFrontend from 'wix-window-frontend';
import { saveMemberBusinessProfile } from 'backend/memberData.web';

const DEFAULT_AVATAR = "https://static.wixstatic.com/media/155164_1f5df41ae90741139acb1148f2b4f864~mv2.png";

let _uploadedFileUrl = null;

$w.onReady(function () {
    const context = wixWindowFrontend.lightbox.getContext();
    
    // Initial UI State
    if (context?.ccCompanyLogo) {
        $w('#imgLogoPreview').src = context.ccCompanyLogo;
        _uploadedFileUrl = context.ccCompanyLogo;
    }

    $w('#uploadProgressBar').value = 0;
    $w('#uploadProgressBar').hide();

    // 003 & 004. Drag and drop / File Search
    $w('#uploadButton').onChange(async () => {
        if ($w('#uploadButton').value.length > 0) {
            await handleFileUpload();
        }
    });

    // 007. Save Logic
    $w('#btnSave').onClick(async () => {
        if (!_uploadedFileUrl) return;

        $w('#btnSave').disable();
        $w('#btnSave').label = "Saving...";

        try {
            // Merges ccCompanyLogo into the existing record
            await saveMemberBusinessProfile({ ccCompanyLogo: _uploadedFileUrl });
            wixWindowFrontend.lightbox.close(true);
        } catch (err) {
            console.error('[cc-v1.0.0] Save error:', err);
            $w('#btnSave').enable();
            $w('#btnSave').label = "Save Logo";
        }
    });

    $w('#btnCancel').onClick(() => wixWindowFrontend.lightbox.close(false));
});

/**
 * Handles the actual file upload and progress bar
 */
async function handleFileUpload() {
    $w('#uploadProgressBar').show();
    $w('#uploadProgressBar').value = 10; // Start progress visual

    try {
        // 006. Real upload to Wix Media Manager
        const uploadResult = await $w('#uploadButton').startUpload();
        
        $w('#uploadProgressBar').value = 100;
        
        // 005. Replace preview image
        _uploadedFileUrl = uploadResult.url;
        $w('#imgLogoPreview').src = _uploadedFileUrl;
        
        console.log('[cc-v1.0.0] File uploaded successfully:', _uploadedFileUrl);

    } catch (uploadError) {
        console.error('[cc-v1.0.0] Upload failed:', uploadError);
        $w('#uploadProgressBar').hide();
        // Handle file type/size errors here
    }
}