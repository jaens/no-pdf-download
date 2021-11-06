/** Is the extension in development mode (temporary / unpacked)? */
export let isTemporaryInstall = false;

/**
 * Log only if the extension is in development mode.
 *
 * @param {*} args
 */
export function debugLog(...args) {
    if (isTemporaryInstall) {
        console.debug(...args);
    }
}

if (typeof chrome === "object") {
    if (/\bFirefox\b/.test(navigator.userAgent)) {
        chrome.runtime.onInstalled.addListener((details) => {
            console.debug("onInstalled", details);
            // @ts-ignore Firefox-only property
            isTemporaryInstall = !!details.temporary;
        });
    } else {
        isTemporaryInstall = !("update_url" in chrome.runtime.getManifest());
    }
}
