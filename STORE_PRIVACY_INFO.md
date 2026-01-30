# Chrome Web Store - Privacy Tab Details

Here is the information you need to fill out the Privacy tab in the Chrome Web Store Developer Dashboard.

## Single Purpose
**Description:** Content Conversion Tool
**Explanation:** MDify converts the current web page into Markdown format to facilitate easy input into AI tools.

## Permission Justification

### Active Tab (`activeTab`)
**Justification:**
MDify requires `activeTab` permission to access the DOM of the currently viewed page *only when the user clicks the extension icon*. This is necessary to extract the page content (HTML) and convert it into Markdown format for the user.

### Clipboard Write (`clipboardWrite`)
**Justification:**
MDify provides a "Copy" button in its popup interface. The `clipboardWrite` permission is required to programmatically copy the generated Markdown text to the user's clipboard for paste functionality.

### Host Permissions (`host_permissions` / `<all_urls>`)
*(Note: You likely need to justify the content script access or specific AI site access)*

**Justification:**
MDify extracts article content from the web pages the user visits to convert them to Markdown.
*   **For Content Extraction:** The extension acts on the user's current page to provide the core conversion functionality.
*   **For AI Platform Injection:** MDify requires access to specific AI platforms (Claude, ChatGPT, Gemini, etc.) to programmatically insert the converted Markdown into the chat input field upon the user's explicit request.

## Data Usage

**Does your extension collect any user data?**
No.

**Certification:**
*   [x] I certify that the information I have provided is correct.

**Privacy Policy URL:**
*(You will need to host the `PRIVACY_POLICY.md` file somewhere public, e.g., GitHub Pages or a website, and paste the link here. If you haven't hosted it yet, you can point to your repository's raw file link if it's public.)*
