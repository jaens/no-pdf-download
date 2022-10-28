import { chromeHeadersToMap, handleHeaders } from "./headers.js";
import { currentMode, initMode, nextMode } from "./mode.js";
import { debugLog } from "./util.js";

chrome.browserAction.onClicked.addListener(() => {
    nextMode();
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
        const savedInfo = getSavedRequestInfo(details.requestId);
        const responseHeaders = handleHeaders(details, currentMode, savedInfo);
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

/** @typedef { {requestId: string, isIframeNavigation: boolean} } SavedRequestInfo */

/**
 * Save useful information about requests to use it later in onHeadersReceived.
 * Limited size ring buffer.
 *
 * @type SavedRequestInfo[]
 */
const savedRequestInfo = [];
const MAX_SAVED_INFO = 16;
let currentSavedInfoIndex = 0;

/**
 * @param {string} requestId
 */
function getSavedRequestInfo(requestId) {
    return savedRequestInfo.find((info) => info.requestId === requestId);
}

/**
 * @param {SavedRequestInfo} info
 */
function addSavedRequestInfo(info) {
    savedRequestInfo[currentSavedInfoIndex] = info;
    currentSavedInfoIndex = (currentSavedInfoIndex + 1) % MAX_SAVED_INFO;
}

chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        // TODO: Add tests for this.
        const { requestId, requestHeaders, type } = details;
        if (type !== "sub_frame") {
            return;
        }
        const headersMap = chromeHeadersToMap(requestHeaders);
        const isIframeNavigation =
            // Currently, the only known cases of breakage are for cross-origin iframes (usually CDN).
            headersMap.get("Sec-Fetch-Site") === "cross-site" &&
            headersMap.get("Sec-Fetch-Mode") === "navigate" &&
            headersMap.get("Sec-Fetch-Dest") === "iframe";

        // Only save details for interesting requests
        if (isIframeNavigation) {
            debugLog("Request details: ", details);
            addSavedRequestInfo({
                requestId,
                isIframeNavigation,
            });
        }
    },
    {
        types: ["main_frame", "sub_frame"],
        urls: ["<all_urls>"],
    },
    ["requestHeaders"]
);

initMode();

console.info("No PDF Download extension loaded");
