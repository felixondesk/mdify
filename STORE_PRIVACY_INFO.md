# Chrome Web Store Privacy Justification

## Single Purpose Description
**Question:** Please provide a Single Purpose Description of your extension.

**Answer:**
Converts web pages into clean Markdown format for use with AI chatbots and LLMs.


## Storage Permission
**Question:** Please justify why your extension requires the "storage" permission.

**Answer:**
The extension uses the `storage` permission to save user preferences locally. Specifically, it stores:
1.  **UI State:** The user's preference to minimize the floating overlay button on specific websites.
2.  **Exclusions:** A user-defined list of domain names where the overlay should not appear (controlled via the "Always close for this website" feature).
3.  **Temporary State:** Timestamps to support the "Close for 10 minutes" feature.

All data is stored locally within the user's browser (using `chrome.storage.local` and `chrome.storage.sync`) and is never transmitted to external servers.

## Host Permissions (`<all_urls>`)
**Question:** Please justify why your extension requires access to all hosts.

**Answer:**
The core functionality of MDify is to convert *any* webpage the user visits into Markdown format. To achieve this, the content script must be able to inject into the active tab to parse the DOM and extract the article content (using `@mozilla/readability`). Without access to `<all_urls>`, the extension cannot perform its primary function of converting arbitrary web pages.
