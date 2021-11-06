"use strict";

const PDF_EXTENSION = ".pdf";
const PDF_MIME_TYPE = "application/pdf";
const PDF_MIME_TYPES = [
    "application/pdf",
    "image/pdf",
    "text/pdf",
    "application/x-pdf",
    "image/x-pdf",
    "text/x-pdf",
    "application/acrobat",
    "applications/vnd.pdf",
];
const BINARY_MIME_TYPES = ["application/octet-stream", "application/force-download", "binary/octet-stream"];
const HEADER_CONTENT_DISPOSITION = "Content-Disposition";
const HEADER_CONTENT_TYPE = "Content-Type";

/** @typedef {chrome.webRequest.HttpHeader[]} ChromeHeaders */
/** @typedef { {i: number, v: string } } Header*/

/**
 *
 * @param {string} url
 * @param {ChromeHeaders} headers
 * @returns {ChromeHeaders | null}
 */
export function handleHeaders(url, headers) {
    // Get content type header
    const ct = getHeader(headers, HEADER_CONTENT_TYPE);
    if (ct == null) {
        return null;
    }

    // Check for PDF and modify headers if needed
    const cd = getHeader(headers, HEADER_CONTENT_DISPOSITION);

    if (isPdf(url, ct.v, cd?.v)) {
        const initialCt = ct.v;
        const initialCd = cd?.v;

        changeHeaders(headers, ct, cd);

        console.debug(
            "Changed content type from %o -> %o and disposition from %o -> %o for URL %s",
            initialCt,
            ct.v,
            initialCd,
            getHeader(headers, HEADER_CONTENT_DISPOSITION)?.v,
            url
        );

        return headers;
    }

    return null;
}

/**
 * @param {string} url
 * @param {string} type
 * @param {string | undefined} disposition
 */
function isPdf(url, type, disposition) {
    // Check if content type is PDF
    const mimeType = getFirstHeaderField(type).toLowerCase();
    if (PDF_MIME_TYPES.includes(mimeType)) {
        return true;
    }

    // Octet-streams may be PDFs, we have to check the extension
    if (!BINARY_MIME_TYPES.includes(mimeType)) {
        return false;
    }

    if (disposition != null) {
        // Check content disposition filename
        const filename = getDispositionFilename(disposition);
        if (filename !== false) {
            // Return either way bacause we got the "official" file name
            return filename.toLowerCase().endsWith(PDF_EXTENSION);
        }
    }

    // In case there is no disposition file name, we check for URL (without
    // query string).
    url = url.split("?")[0];
    return url.toLowerCase().endsWith(PDF_EXTENSION);
}

/**
 * Returns the first filename found in content disposition header.
 *
 * @param {string} disposition
 */
function getDispositionFilename(disposition) {
    // Filename may be in quotes, see: https://tools.ietf.org/html/rfc2183
    // Regex: https://regex101.com/r/NJiElq/5
    const re = /; ?filename=(?:(?:\"(.*?)\")|([^;"]+))/i;
    const m = re.exec(disposition);
    if (m == null) {
        return false;
    }
    return m[1] != null ? m[1] : m[2];
}

/**
 * @param {ChromeHeaders} headers
 * @param {Header} ct
 * @param {Header | null} cd
 */
function changeHeaders(headers, ct, cd) {
    // Normalize PDF mime type
    headers[ct.i].value = replaceFirstHeaderField(ct.v, PDF_MIME_TYPE);

    // Remove attachment header. Also make sure to always add an inline header.
    // This is needed to prevent downloading if the HTML5 "download" tag is set.
    // Only works in Firefox (57.0). Chrome (62.0) will always download if
    // "download"-tag is set.
    if (cd == null) {
        headers.push({
            name: HEADER_CONTENT_DISPOSITION,
            value: "inline",
        });
    } else {
        headers[cd.i].value = replaceFirstHeaderField(cd.v, "inline");
    }
}

/* Header Helpers */

/**
 * Returns an object where i is header index and v is the header value. If the
 * header does not exist, i will be -1.
 *
 * @param {ChromeHeaders} headers
 * @param {string} name
 * @returns {Header | null}
 */
function getHeader(headers, name) {
    name = name.toLowerCase();
    for (let i = 0, max = headers.length; i < max; i++) {
        const header = headers[i];
        if (header.name.toLowerCase() == name) {
            return { i: i, v: header.value ?? "" };
        }
    }
    return null;
}

/**
 * Replaces text before the first semicolon with the given string.
 *
 * @param {string} value
 * @param {string} replace
 */
function replaceFirstHeaderField(value, replace) {
    const pos = value.indexOf(";");
    return pos == -1 ? replace : replace + value.substring(pos);
}

/**
 * Returns the text before the first semicolon without leading/trailing spaces.
 *
 * @param {string} value
 */
function getFirstHeaderField(value) {
    const pos = value.indexOf(";");
    const str = pos == -1 ? value : value.substring(0, pos);
    return str.trim();
}
