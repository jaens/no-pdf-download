import { allModes, handleHeaders } from "./headers.js";

let currentMode = allModes[0];

/** @type {Record<import("./headers.js").Mode, {title: string, badge: string, color:string}>} */
const badges = {
    inline: { title: "Enabled", badge: "", color: "#0A0" },
    attachment: { title: "Always download", badge: "DL", color: "#A00" },
    disabled: { title: "Disabled", badge: "X", color: "#888" },
};

function updateBrowserAction() {
    const manifest = chrome.runtime.getManifest();
    const info = badges[currentMode];

    chrome.browserAction.setTitle({
        title: `${info.title} - ${manifest.short_name}`,
    });
    if (chrome.browserAction.setBadgeText) {
        // Not available on Android
        chrome.browserAction.setBadgeText({ text: info.badge });
        chrome.browserAction.setBadgeBackgroundColor({ color: info.color });
    }
}

function loadMode() {
    chrome.storage.local.get("mode", ({ mode }) => {
        currentMode = allModes.indexOf(mode) !== -1 ? mode : allModes[0];
        updateBrowserAction();
    });
}

function saveMode() {
    chrome.storage.local.set({ mode: currentMode });
}

chrome.browserAction.onClicked.addListener(() => {
    currentMode = allModes[(allModes.indexOf(currentMode) + 1) % allModes.length];
    updateBrowserAction();
    saveMode();
    console.debug("Browser action clicked", { currentMode });
});

const extraInfoSpec = ["responseHeaders", "blocking"];
// For Chrome we have to use "extraHeaders" to get all headers
if (
    // @ts-ignore OnBeforeSendHeadersOptions is not exported
    chrome.webRequest.OnBeforeSendHeadersOptions.hasOwnProperty("EXTRA_HEADERS")
) {
    extraInfoSpec.push("extraHeaders");
}

// Register receiver for reponse headers
chrome.webRequest.onHeadersReceived.addListener(
    (details) => {
        const responseHeaders = handleHeaders(details, currentMode);
        if (responseHeaders != null) {
            return { responseHeaders };
        }
    },
    {
        types: ["main_frame", "sub_frame"],
        urls: ["<all_urls>"],
    },
    extraInfoSpec
);

updateBrowserAction();
loadMode();

console.info("No PDF Download extension loaded");
