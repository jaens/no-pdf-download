import { deepStrictEqual } from "assert";
import * as headers from "../app/src/headers.js";

describe("Handle Headers", () => {
    it("Empty", () => {
        testHandleHeaders("", [], false);
    });
    it("False positive", () => {
        testHandleHeaders(
            "",
            [
                ["Server", "nginx/1.13.7"],
                ["Content-Length", "456"],
                ["Content-Encoding", "gzip"],
                ["Content-Type", "text/html; charset=utf-8"],
            ],
            false
        );
    });
    it("False positive HTML", () => {
        testHandleHeaders(
            "http://test.com/test.pdf",
            [
                ["Content-Disposition", "attachment"],
                ["Content-Type", "text/html"],
            ],
            false
        );
    });
    it("False positive image", () => {
        testHandleHeaders(
            "",
            [
                ["Content-Disposition", "attachment; filename=test.pdf"],
                ["Content-Type", "image/jpeg"],
            ],
            false
        );
    });
    it("Normal PDF", () => {
        testHandleHeaders(
            "",
            [["Content-Type", "Application/PDF"]],
            [
                ["Content-Type", "application/pdf"],
                ["Content-Disposition", "inline"],
            ]
        );
    });
    it("Inline", () => {
        testHandleHeaders(
            "",
            [
                ["Content-Type", "application/pdf"],
                ["Content-Disposition", "inline"],
            ],
            false
        );
    });
    it("Attachment", () => {
        testHandleHeaders(
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
    });
    it("Attachment with filename", () => {
        testHandleHeaders(
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
    });
    it("Attachment and inline (invalid)", () => {
        testHandleHeaders(
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
    });
    it("Charset", () => {
        testHandleHeaders(
            "",
            [["Content-Type", "application/pdf;charset=ISO-8859-1"]],
            [
                ["Content-Type", "application/pdf;charset=ISO-8859-1"],
                ["Content-Disposition", "inline"],
            ]
        );
    });
    it("x-PDF", () => {
        testHandleHeaders(
            "",
            [["Content-Type", "application/x-pdf"]],
            [
                ["Content-Type", "application/pdf"],
                ["Content-Disposition", "inline"],
            ]
        );
    });
    it("Image-PDF", () => {
        testHandleHeaders(
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
    });
    it("Octet-stream with PDF file name and extra disposition whitespace", () => {
        testHandleHeaders(
            "",
            [
                ["Content-Type", "application/octet-stream"],
                ["Content-Disposition", 'attachment;  filename = "test.pdf"'],
            ],
            [
                ["Content-Type", "application/pdf"],
                ["Content-Disposition", 'inline;  filename = "test.pdf"'],
            ]
        );
    });
    it("Octet-stream with PDF file name and invalid", () => {
        testHandleHeaders(
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
    });
    it("Octet-stream with image", () => {
        testHandleHeaders(
            "http://test.com/test.pdf",
            [
                ["Content-Type", "application/octet-stream"],
                ["Content-Disposition", "attachment;filename=image.jpg"],
            ],
            false
        );
    });
    it("Octet-stream with PDF in URL", () => {
        testHandleHeaders(
            "http://test.com/test.PDF?1",
            [["Content-Type", "application/OCTET-stream "]],
            [
                ["Content-Type", "application/pdf"],
                ["Content-Disposition", "inline"],
            ]
        );
    });
    it("text/html with attachment filename", () => {
        testHandleHeaders(
            "http://test.com/test.pdf",
            [
                ["Content-Type", "text/html"],
                ["Content-Disposition", "attachment; filename=test.pdf"],
            ],
            [
                ["Content-Type", "application/pdf"],
                ["Content-Disposition", "inline; filename=test.pdf"],
            ]
        );
    });
    it("text/html with just filename", () => {
        testHandleHeaders("http://test.com/test.pdf", [["Content-Type", "text/html"]], false);
    });
    it("Application/Force-Download with PDF file name(s)", () => {
        testHandleHeaders(
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
    it("Amazon S3 without content type with PDF file name(s)", () => {
        testHandleHeaders(
            "http://some-bucket.s3.us-east-1.amazonaws.com/12345.pdf?response-content-disposition=attachment",
            [
                ["Content-Disposition", "attachment"],
                ["Content-Type", ""],
            ],
            [
                ["Content-Disposition", "inline"],
                ["Content-Type", "application/pdf"],
            ]
        );
    });
    it("Incomplete content type", () => {
        testHandleHeaders(
            "http://quod.lib.umich.edu/cgi/p/pod/dod-idx/some.pdf",
            [
                ["Content-Disposition", "attachment"],
                ["Content-Type", "application/; charset=ISO-8859-1"],
            ],
            [
                ["Content-Disposition", "inline"],
                ["Content-Type", "application/pdf; charset=ISO-8859-1"],
            ]
        );
    });
    it("Dropbox", () => {
        testHandleHeaders(
            "/cd/0/get/xxx-yyy-zzz/file?dl=1",
            [
                ["Content-Disposition", `attachment; filename="thesis.pdf"; filename*=UTF-8''thesis.pdf`],
                ["Content-Type", "application/binary"],
            ],
            [
                ["Content-Disposition", `inline; filename="thesis.pdf"; filename*=UTF-8''thesis.pdf`],
                ["Content-Type", "application/pdf"],
            ]
        );
    });
});

/* Helper Functions */

/**
 * Tests header arrays. If expectedHeaders is set to `false` headers must not
 * change.
 *
 * @param {string} url
 * @param {string[][]} requestHeaders
 * @param {string[][] | false} expectedHeaders
 */
function testHandleHeaders(url, requestHeaders, expectedHeaders) {
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
    deepStrictEqual(newHeaders, expectedArray);
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
