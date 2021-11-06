"use strict";

import * as headers from "../app/src/headers.js";
import { deepStrictEqual } from "assert";

describe("Handle Headers", () => {
    testHandleHeaders("Empty", "", [], false);
    testHandleHeaders(
        "False positive",
        "",
        [
            ["Server", "nginx/1.13.7"],
            ["Content-Length", "456"],
            ["Content-Encoding", "gzip"],
            ["Content-Type", "text/html; charset=utf-8"],
        ],
        false
    );
    testHandleHeaders(
        "False positive HTML",
        "http://test.com/test.pdf",
        [
            ["Content-Disposition", "attachment"],
            ["Content-Type", "text/html"],
        ],
        false
    );
    testHandleHeaders(
        "False positive image",
        "",
        [
            ["Content-Disposition", "attachment; filename=test.pdf"],
            ["Content-Type", "image/jpeg"],
        ],
        false
    );
    testHandleHeaders(
        "Normal PDF",
        "",
        [["Content-Type", "Application/PDF"]],
        [
            ["Content-Type", "application/pdf"],
            ["Content-Disposition", "inline"],
        ]
    );
    testHandleHeaders(
        "Inline",
        "",
        [
            ["Content-Type", "application/pdf"],
            ["Content-Disposition", "inline"],
        ],
        false
    );
    testHandleHeaders(
        "Attachment",
        "",
        [
            ["Content-Type", "application/pdf"],
            ["Content-Disposition", "ATTACHMENT"],
        ],
        [
            ["Content-Type", "application/pdf"],
            ["Content-Disposition", "inline"],
        ]
    );
    testHandleHeaders(
        "Attachment with filename",
        "http://test.com/test.pdf",
        [
            ["Content-Type", "application/pdf"],
            ["Content-Disposition", "attachment;filename=test.pdf"],
        ],
        [
            ["Content-Type", "application/pdf"],
            ["Content-Disposition", "inline;filename=test.pdf"],
        ]
    );
    testHandleHeaders(
        "Attachment and inline (invalid)",
        "",
        [
            ["content-type", "application/pdf"],
            ["Content-Disposition", "attachment; filename=test.pdf; inline"],
        ],
        [
            ["content-type", "application/pdf"],
            ["Content-Disposition", "inline; filename=test.pdf; inline"],
        ]
    );
    testHandleHeaders(
        "Charset",
        "",
        [["Content-Type", "application/pdf;charset=ISO-8859-1"]],
        [
            ["Content-Type", "application/pdf;charset=ISO-8859-1"],
            ["Content-Disposition", "inline"],
        ]
    );
    testHandleHeaders(
        "x-PDF",
        "",
        [["Content-Type", "application/x-pdf"]],
        [
            ["Content-Type", "application/pdf"],
            ["Content-Disposition", "inline"],
        ]
    );
    testHandleHeaders(
        "Image-PDF",
        "",
        [
            ["Expires", "Sat, 27 Jan 2018 22:48:52 GMT"],
            ["Content-Type", "image/pdf;charset=ISO-8859-1"],
        ],
        [
            ["Expires", "Sat, 27 Jan 2018 22:48:52 GMT"],
            ["Content-Type", "application/pdf;charset=ISO-8859-1"],
            ["Content-Disposition", "inline"],
        ]
    );
    testHandleHeaders(
        "Octet-stream with PDF file name and invalid",
        "",
        [
            ["Content-Type", "application/octet-stream"],
            ["Content-Disposition", 'attachment;filename="te;t.pdf";filename=img.jpg'],
        ],
        [
            ["Content-Type", "application/pdf"],
            ["Content-Disposition", 'inline;filename="te;t.pdf";filename=img.jpg'],
        ]
    );
    testHandleHeaders(
        "Octet-stream with image",
        "http://test.com/test.pdf",
        [
            ["Content-Type", "application/octet-stream"],
            ["Content-Disposition", "attachment;filename=image.jpg"],
        ],
        false
    );
    testHandleHeaders(
        "Octet-stream with PDF in URL",
        "http://test.com/test.PDF?1",
        [["Content-Type", "application/OCTET-stream "]],
        [
            ["Content-Type", "application/pdf"],
            ["Content-Disposition", "inline"],
        ]
    );
    testHandleHeaders(
        "Application/Force-Download with PDF file name(s)",
        "http://test.com/02000",
        [
            ["Content-Disposition", "attachment; filename=\"ABC_2019.pdf\"; filename*=UTF-8''ABC_2019.pdf"],
            ["Content-Type", "application/force-download"],
        ],
        [
            ["Content-Disposition", "inline; filename=\"ABC_2019.pdf\"; filename*=UTF-8''ABC_2019.pdf"],
            ["Content-Type", "application/pdf"],
        ]
    );
});

/* Helper Functions */

/**
 * Tests header arrays. If expectedHeaders is set to `false` headers must not
 * change.
 *
 * @param {string} name
 * @param {string} url
 * @param {string[][]} requestHeaders
 * @param {string[][] | false} expectedHeaders
 */
function testHandleHeaders(name, url, requestHeaders, expectedHeaders) {
    // Prepare expected headers
    if (expectedHeaders === false) {
        expectedHeaders = requestHeaders;
    }

    // Get new headers
    const headersArray = makeHeaderArray(requestHeaders);
    /** @type {chrome.webRequest.WebResponseHeadersDetails} */
    const details = {
        responseHeaders: headersArray,
        url,
        method: "GET",
        statusLine: "",
        statusCode: 0,
        requestId: "123",
        frameId: 0,
        parentFrameId: 0,
        tabId: 0,
        type: "main_frame",
        timeStamp: 0,
    };
    const newHeaders = headers.handleHeaders(details) ?? headersArray;
    newHeaders.sort(cmpHeaders);

    // Test
    const expectedArray = makeHeaderArray(expectedHeaders).sort(cmpHeaders);
    it(name, () => {
        deepStrictEqual(newHeaders, expectedArray);
    });
}

/**
 * @param {string[][]} headers
 * @returns {headers.ChromeHeaders}
 */
function makeHeaderArray(headers) {
    return headers.map((values) => ({
        name: values[0],
        value: values[1],
    }));
}

/**
 * @param {chrome.webRequest.HttpHeader} header1
 * @param {chrome.webRequest.HttpHeader} header2
 * @returns {number}
 */
function cmpHeaders(header1, header2) {
    // Compare by name
    if (header1.name !== header2.name) {
        return header1.name > header2.name ? 1 : -1;
    }

    // Compare by value
    if (header1.value !== header2.value) {
        // @ts-ignore comparing undefined
        return header1.value > header2.value ? 1 : -1;
    }
    return 0;
}
