[![Continuous Integration](https://github.com/jaens/no-pdf-download/actions/workflows/node.js.yml/badge.svg)](https://github.com/jaens/no-pdf-download/actions/workflows/node.js.yml)

# No PDF Download

**No PDF Download** is a Web Extension for Firefox, available here: https://addons.mozilla.org/firefox/addon/no-pdf-download-improved/

While most PDF files can be viewed directly in the browser, some PDFs will trigger a "Save as"-dialog or will be downloaded automatically. This addon views all PDF files directly in the browser. You can still save the PDF by pressing Ctrl+S (or Cmd+S) after viewing them.

Some web servers are misconfigured and do not tell the browser that a file is a PDF. In this case the file will still be downloaded even when this addon is active.

# Development

This repository is https://github.com/jaens/no-pdf-download/, a fork of https://github.com/MorbZ/no-pdf-download.

# Changes from original

-   Properly support more sites:
    -   Google apps
    -   Dropbox
    -   Amazon cloud
    -   itch.io
    -   various universities
-   Allow forcing downloads and disabling the extension by clicking on the browser action icon.
-   Development:
    -   Add type definitions & linting.
