"use strict";

import { handleHeaders } from "./headers.js";

// For Chrome we have to use "extraHeaders" to get all headers
const extraInfoSpec = ["responseHeaders", "blocking"];
if (
    // @ts-ignore OnBeforeSendHeadersOptions is not exported
    chrome.webRequest.OnBeforeSendHeadersOptions.hasOwnProperty("EXTRA_HEADERS")
) {
    extraInfoSpec.push("extraHeaders");
}

// Register receiver for reponse headers
chrome.webRequest.onHeadersReceived.addListener(
    (details) => {
        const responseHeaders = handleHeaders(
            details.url,
            // @ts-ignore not nullable
            details.responseHeaders
        );
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

console.info("No PDF Download extension loaded");
