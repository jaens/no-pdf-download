import { allModes } from "./headers.js";

export let currentMode = allModes[0];

/** @type {Record<import("./headers.js").Mode, {title: string, badge: string, color:string}>} */
const badges = {
    inline: { title: "Enabled", badge: "", color: "#0A0" },
    attachment: { title: "Always download", badge: "DL", color: "#A00" },
    disabled: { title: "Disabled", badge: "X", color: "#888" },
};

export function nextMode() {
    currentMode = allModes[(allModes.indexOf(currentMode) + 1) % allModes.length];
    updateBrowserAction();
    saveMode();
}

export function initMode() {
    loadMode();
    updateBrowserAction();
}

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
