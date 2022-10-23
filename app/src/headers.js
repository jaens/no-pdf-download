import { debugLog } from "./util.js";

/** @typedef {"inline" | "attachment" | "disabled"} Mode */

/** @type {Mode[]} */
export const allModes = ["inline", "attachment", "disabled"];

const PDF_EXTENSION = ".pdf";
const PDF_MIME_TYPE = "application/pdf";
const PDF_MIME_TYPES = new Set([
    "application/pdf",
    "image/pdf",
    "text/pdf",
    "application/x-pdf",
    "image/x-pdf",
    "text/x-pdf",
    "application/acrobat",
    "applications/vnd.pdf",
]);
const BINARY_MIME_TYPES = new Set([
    "application/octet-stream",
    "application/force-download",
    "binary/octet-stream",
    // Dropbox
    "application/binary",
    // S3 buckets might have files without Content-type set
    "",
]);
const GENERIC_MIME_TYPES = new Set(["text/html"]);

const HEADER_CONTENT_DISPOSITION = "Content-Disposition";
const HEADER_CONTENT_TYPE = "Content-Type";

/** @typedef {chrome.webRequest.HttpHeader[]} ChromeHeaders */
/** @typedef { {idx: number, value: string } } Header*/

/**
 * Is the request potentially a Gmail download or Google Docs print request?
 *
 * @param {chrome.webRequest.WebResponseHeadersDetails} details
 */
function isGoogleRequest(details) {
    const { type, url } = details;
    if (type !== "sub_frame") {
        return false;
    }
    const parsed = new URL(url);
    return /\.(?:google|googleusercontent)\.com$/.test(parsed.hostname);
}

/**
 * @param {chrome.webRequest.WebResponseHeadersDetails} details
 * @param {Mode} mode
 * @returns {ChromeHeaders | null}
 */
export function handleHeaders(details, mode = "inline") {
    if (mode === "disabled") {
        return null;
    }

    const headers = details.responseHeaders;
    if (headers == null) {
        return null;
    }
    const { url } = details;

    // Get content type header
    const type = getHeader(headers, HEADER_CONTENT_TYPE);
    if (type == null) {
        return null;
    }

    // Check for PDF and modify headers if needed
    const disposition = getHeader(headers, HEADER_CONTENT_DISPOSITION);

    if (isPdf(url, type.value, disposition?.value)) {
        debugLog("Request details: ", details);

        if (isGoogleRequest(details)) {
            console.debug("Skipping Google request at %s", url);
            return null;
        }

        const initialType = type.value;
        const initialDisposition = disposition?.value;

        changeHeaders(headers, type, disposition, mode);

        console.debug(
            "Changed %o\nfor URL %s",
            {
                type: {
                    from: initialType,
                    to: type.value,
                },
                disposition: {
                    from: initialDisposition,
                    to: getHeader(headers, HEADER_CONTENT_DISPOSITION)?.value,
                },
            },
            url
        );

        return headers;
    }

    return null;
}

/**
 * @param {string} mimeType
 */
function isValidMimeType(mimeType) {
    const p = mimeType.split("/");
    return p.length === 2 && p[0] !== "" && p[1] !== "";
}

/**
 * @param {string} url
 * @param {string} type
 * @param {string | undefined} disposition
 */
function isPdf(url, type, disposition) {
    // Check if content type is PDF
    const mimeType = getFirstHeaderField(type).toLowerCase();
    if (PDF_MIME_TYPES.has(mimeType)) {
        return true;
    }

    const filename = disposition != null && getDispositionFilename(disposition);

    // Octet-streams may be PDFs, we have to check the extension
    if (
        !BINARY_MIME_TYPES.has(mimeType) &&
        isValidMimeType(mimeType) &&
        // Some sites send PDF attachments with a MIME type of "text/html", fall
        // back to detection by extension
        (filename === false || !GENERIC_MIME_TYPES.has(mimeType))
    ) {
        return false;
    }

    if (filename !== false) {
        // Return either way bacause we got the "official" file name
        return filename.toLowerCase().endsWith(PDF_EXTENSION);
    }

    // In case there is no disposition file name, we check for URL (without
    // query string).
    url = url.split("?", 1)[0];
    return url.toLowerCase().endsWith(PDF_EXTENSION);
}

/**
 * Returns the first filename found in content disposition header.
 *
 * @param {string} disposition
 */
function getDispositionFilename(disposition) {
    // Filename may be in quotes, see: https://tools.ietf.org/html/rfc2183
    const re = /;[\t ]*filename[\t ]*=[\t ]*(?:(?:\"(.*?)\")|([^;"]+))/i;
    const m = re.exec(disposition);
    if (m == null) {
        return false;
    }
    return m[1] != null ? m[1] : m[2];
}

/**
 * @param {ChromeHeaders} headers
 * @param {Header} type
 * @param {Header | null} disposition
 * @param {"inline" | "attachment"} mode
 */
function changeHeaders(headers, type, disposition, mode) {
    const mimeType = mode === "inline" ? PDF_MIME_TYPE : "application/octet-stream";
    // Normalize PDF mime type
    headers[type.idx].value = replaceFirstHeaderField(type.value, mimeType);

    const newDisposition = mode;

    // Remove attachment header. Also make sure to always add an inline header.
    // This is needed to prevent downloading if the HTML5 "download" tag is set.
    // Only works in Firefox (57.0). Chrome (62.0) will always download if
    // "download"-tag is set.
    if (disposition == null) {
        headers.push({
            name: HEADER_CONTENT_DISPOSITION,
            value: newDisposition,
        });
    } else {
        headers[disposition.idx].value = replaceFirstHeaderField(disposition.value, newDisposition);
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
            return { idx: i, value: header.value ?? "" };
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
