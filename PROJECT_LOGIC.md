# MDify - Project Logic Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [Data Flow](#data-flow)
5. [Message Passing Protocol](#message-passing-protocol)
6. [Platform Support](#platform-support)
7. [Build Configuration](#build-configuration)
8. [Dependencies](#dependencies)

---

## Project Overview

**MDify** (formerly MDify/PromptCast) is a Chrome extension that converts webpages to clean Markdown format and injects the content directly into AI platform interfaces. It acts as a bridge between web content and AI chat interfaces.

**Version:** 1.0.0
**Manifest:** V3
**Tech Stack:** TypeScript, Vite, React, CRXJS

---

## Architecture

### Directory Structure

```
PromptCast/
├── public/
│   ├── manifest.json          # Extension manifest
│   └── icons/                 # Extension icons (16, 32, 48, 128px)
├── src/
│   ├── background/
│   │   └── service-worker.ts  # Background service worker (coordinator)
│   ├── content/
│   │   └── script.ts          # Content scraper (runs on all URLs)
│   ├── inject/
│   │   └── injector.ts        # Content injector (runs on AI platforms)
│   ├── popup/
│   │   ├── popup.ts           # Popup controller
│   │   ├── popup.html         # Popup UI
│   │   └── style.css          # Additional styles
│   └── utils/
│       └── token-counter.ts   # Token counting utility
├── dist/                      # Build output
├── vite.config.ts             # Vite configuration
└── package.json               # Dependencies
```

### Extension Contexts

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser Context                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────┐    ┌─────────────────────────────────────────┐  │
│  │     Popup     │    │         Service Worker (Background)      │  │
│  │  (popup.ts)   │◄──►│      (service-worker.ts)                │  │
│  │               │    │                                         │  │
│  │  UI Layer     │    │  • Tab Management                       │  │
│  │  - Scraping   │    │  • Injection Orchestration              │  │
│  │  - Token Count│    │  • IDE Deep-linking                     │  │
│  │  - Platform   │    │  • Message Routing                      │  │
│  │    Selection  │    │                                         │  │
│  └───────────────┘    └─────────────────────────────────────────┘  │
│         │                                                           │
│         │ chrome.tabs.sendMessage                                   │
│         ▼                                                           │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Content Script (scraper.ts)                     │  │
│  │              Runs on ALL URLs                                │  │
│  │                                                              │  │
│  │  • Scrape page to Markdown                                   │  │
│  │  • Extract content via Readability                           │  │
│  │  • Convert HTML to MD via Turndown                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│                           Service Worker                            │
│                           opens new tab                             │
│                                    │                                 │
│                                    ▼                                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │            Injection Script (injector.ts)                     │  │
│  │            Runs on AI Platform URLs ONLY                     │  │
│  │                                                              │  │
│  │  • Find textarea/contenteditable                             │  │
│  │  • Dispatch React-compatible events                          │  │
│  │  • Inject Markdown content                                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Background Service Worker ([service-worker.ts](src/background/service-worker.ts))

**Purpose:** Central coordinator for all extension operations.

**Key Types:**
```typescript
type Platform = 'claude' | 'chatgpt' | 'gemini' | 'grok' | 'perplexity';
type IDE = 'vscode' | 'cursor' | 'windsurf' | 'zed' | 'antigravity';
```

**Platform URLs:**
| Platform | URL |
|----------|-----|
| Claude | https://claude.ai/new |
| ChatGPT | https://chatgpt.com/ |
| Gemini | https://gemini.google.com/ |
| Grok | https://grok.com/ |
| Perplexity | https://www.perplexity.ai/ |

**IDE Deep-link Schemes:**
| IDE | Scheme |
|-----|--------|
| VS Code | vscode:// |
| Cursor | cursor:// |
| Windsurf | windsurf:// |
| Zed | zed:// |
| Antigravity | antigravity:// |

**Key Functions:**

- **`openAndInject(request)`** - Opens new tab and manages injection timing
  1. Creates new tab with platform URL
  2. Waits for `tab.status === 'complete'`
  3. Waits 1.5s for React initialization
  4. Sends `injectContent` message to injector script
  5. 10-second fallback timeout

- **`handleInjection(platform, markdown)`** - Routes content to AI platforms

- **`handleIDELaunch(ide, markdown)`** - Copies to clipboard and opens IDE

**Message Actions:**
```typescript
interface MessageTypes {
  injectToPlatform: { platform: Platform, markdown: string };
  openWithIDE: { ide: IDE, markdown: string };
  countTokens: { markdown: string };
}
```

### 2. Content Scraper ([script.ts](src/content/script.ts))

**Purpose:** Scrapes webpages and converts to Markdown.

**Runs on:** `<all_urls>`

**Dependencies:**
- `@mozilla/readability` - Content extraction
- `turndown` - HTML to Markdown conversion

**Turndown Configuration:**
```typescript
{
  headingStyle: 'atx',        // # ## ### style
  codeBlockStyle: 'fenced',   // ``` code blocks
  bulletListMarker: '-',       // - for lists
  emDelimiter: '_',           // _ for emphasis
}
```

**Key Functions:**

- **`scrapePageToMarkdown()`** - Main scraping function
  1. Clones document (non-destructive)
  2. Uses Readability to extract main content
  3. Converts HTML to Markdown via Turndown
  4. Adds YAML metadata header
  5. Returns formatted Markdown

**Output Format:**
```markdown
---
title: [Page Title]
url: [Page URL]
excerpt: [Page Excerpt]
---

# [Page Title]

[Markdown content...]
```

### 3. Content Injector ([injector.ts](src/inject/injector.ts))

**Purpose:** Injects Markdown into AI platform text areas.

**Runs on:** AI platform URLs only

**Critical Technical Detail:**
React-based sites don't respond to simple `element.value` assignment. The extension dispatches a carefully sequenced series of native events to trigger React's internal state management.

**Event Sequence:**
```typescript
1. Focus event
2. keydown event
3. keypress event
4. beforeinput event (InputEvent with insertText)
5. input event (InputEvent)
6. change event
7. keyup event
8. React's internal input event
```

**Platform Selectors:**

| Platform | Selectors |
|----------|-----------|
| Claude | `textarea[placeholder*="message"]`, `div[contenteditable="true"]` |
| ChatGPT | `textarea#prompt-textarea`, `div[contenteditable="true"]` |
| Gemini | `textarea[placeholder*="Enter"]`, `rich-textarea` |
| Grok | `textarea[placeholder*="Ask"]`, `div[contenteditable="true"]` |
| Perplexity | `textarea[placeholder*="Ask"]`, `div[contenteditable="true"]` |

**Element Detection Logic:**
```typescript
const isVisible = element.offsetParent !== null;
const isEditable = element.getAttribute('contenteditable') === 'true' ||
                   element.tagName === 'TEXTAREA';
```

**Contenteditable Strategy:**
For `contenteditable` divs, uses a `<pre>` element wrapper to preserve whitespace and line breaks.

### 4. Popup Controller ([popup.ts](src/popup/popup.ts))

**Purpose:** Manages UI and user interactions.

**State:**
```typescript
let currentMarkdown: string | null = null;
let pageTitle = '';
let pageUrl = '';
```

**UI Flow:**
```
1. init() - Queries active tab
2. Sends 'scrapePage' message to content script
3. Receives { markdown, title, url }
4. updateUI() - Updates display and counts tokens
5. Enables all buttons
6. Shows warnings if needed
```

**Token Status Thresholds:**
| Status | Range | Badge Color |
|--------|-------|-------------|
| Safe | < 25,000 | Green |
| Heavy Context | 25,000 - 100,000 | Orange |
| Split Required | > 100,000 | Red |

**Token Formatting:**
- `>= 1,000,000` → X.XM
- `>= 1,000` → X.XK
- `< 1,000` → Raw number

### 5. Token Counter ([token-counter.ts](src/utils/token-counter.ts))

**Purpose:** Accurate token counting using GPT tokenizer.

**Library:** `gpt-tokenizer`

**Functions:**
- `countTokens(text)` - Returns token count
- `getTokenStatus(count)` - Returns status object
- `formatTokenCount(count)` - Formats for display

---

## Data Flow

### Complete Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 1: User clicks extension icon                                  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 2: Popup opens and initializes                                 │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ popup.ts: init()                                                 ││
│ │  1. chrome.tabs.query({ active: true, currentWindow: true })    ││
│ │  2. chrome.tabs.sendMessage(tabId, { action: 'scrapePage' })    ││
│ └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 3: Content script scrapes page                                 │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ script.ts: chrome.runtime.onMessage                             ││
│ │  1. scrapePageToMarkdown()                                      ││
│ │  2. Clone document                                              ││
│ │  3. Readability.parse() - Extract main content                  ││
│ │  4. turndownService.turndown() - Convert to MD                 ││
│ │  5. Add YAML metadata                                           ││
│ │  6. Return { markdown, title, url }                             ││
│ └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 4: Popup updates UI                                            │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ popup.ts: updateUI()                                            ││
│ │  1. Display page title and URL                                  ││
│ │  2. countTokens(markdown)                                       ││
│ │  3. Update token badge with status                              ││
│ │  4. Enable all platform/IDE buttons                             ││
│ │  5. Show warnings if heavy/critical                             ││
│ └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 5: User clicks platform button (e.g., Claude)                  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 6: Popup sends injection request                               │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ chrome.runtime.sendMessage({                                    ││
│ │   action: 'injectToPlatform',                                   ││
│ │   platform: 'claude',                                           ││
│ │   markdown: currentMarkdown                                     ││
│ │ })                                                              ││
│ └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 7: Service worker opens new tab and coordinates injection      │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ service-worker.ts: openAndInject()                             ││
│ │  1. chrome.tabs.create({ url: platformUrl })                   ││
│ │  2. Wait for tab.status === 'complete'                         ││
│ │  3. setTimeout(1500ms) - Wait for React mount                   ││
│ │  4. chrome.tabs.sendMessage({ action: 'injectContent' })       ││
│ └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 8: Injector script injects content (platform-specific)         │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ injector.ts: injectContent()                                   ││
│ │  1. Query all matching elements (platform-specific)            ││
│ │  2. Find visible, editable element                              ││
│ │  3. Platform-specific handlers:                                 ││
│ │     • ChatGPT: injectIntoChatGPT() - plain text for MD render  ││
│ │     • Gemini: injectIntoGemini() - explicit color for dark mode││
│ │     • Others: Generic handler                                   ││
│ │  4. If textarea: dispatchReactInputEvents()                    ││
│ │  5. If contenteditable: injectIntoContentEditable()             ││
│ │  6. Dispatch comprehensive event sequence                       ││
│ └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 9: Content appears in AI platform interface                    │
└─────────────────────────────────────────────────────────────────────┘
```

### IDE Launch Flow

```
User clicks IDE button
        │
        ▼
popup.ts: openWithIDE()
        │
        ▼
chrome.runtime.sendMessage({
  action: 'openWithIDE',
  ide: 'vscode',
  markdown: content
})
        │
        ▼
service-worker.ts: handleIDELaunch()
        │
        ├── 1. navigator.clipboard.writeText(markdown)
        │
        └── 2. chrome.tabs.create({ url: 'vscode://' })
```

---

## Message Passing Protocol

### Message Types

#### 1. Popup → Content Script (Scraping)
```typescript
// Request
chrome.tabs.sendMessage(tabId, {
  action: 'scrapePage'
})

// Response
{
  markdown: string;
  title: string;
  url: string;
}
```

#### 2. Popup → Service Worker (Injection)
```typescript
// Request
chrome.runtime.sendMessage({
  action: 'injectToPlatform',
  platform: 'claude' | 'chatgpt' | 'gemini' | 'grok' | 'perplexity',
  markdown: string
})

// Response
{
  success: boolean;
  url?: string;
}
```

#### 3. Popup → Service Worker (IDE Launch)
```typescript
// Request
chrome.runtime.sendMessage({
  action: 'openWithIDE',
  ide: 'vscode' | 'cursor' | 'windsurf' | 'zed' | 'antigravity',
  markdown: string
})

// Response
{
  success: boolean;
  url?: string;
}
```

#### 4. Popup → Service Worker (Token Count)
```typescript
// Request
chrome.runtime.sendMessage({
  action: 'countTokens',
  markdown: string
})

// Response
{
  count: number;
}
```

#### 5. Service Worker → Injector (Injection)
```typescript
// Request
chrome.tabs.sendMessage(tabId, {
  action: 'injectContent',
  markdown: string,
  platform: string
})

// Response
{
  success: boolean;
}
```

---

## Platform Support

### AI Platforms

| Platform | Base URL | Contenteditable | Textarea | Special Handling |
|----------|----------|-----------------|----------|------------------|
| Claude | claude.ai | ✓ | ✓ | Multiple selector fallback |
| ChatGPT | chatgpt.com | ✓ | ✓ | #prompt-textarea ID, plain text MD injection |
| Gemini | gemini.google.com | ✓ | ✓ | rich-textarea custom element, dark mode color fix |
| Grok | grok.com | ✓ | ✓ | Ask placeholder |
| Perplexity | perplexity.ai | ✓ | ✓ | Ask placeholder |

### IDEs (Deep-linking)

| IDE | Scheme | Notes |
|-----|--------|-------|
| VS Code | vscode:// | Copies to clipboard first |
| Cursor | cursor:// | Copies to clipboard first |
| Windsurf | windsurf:// | Copies to clipboard first |
| Zed | zed:// | Copies to clipboard first |
| Antigravity | antigravity:// | Copies to clipboard first |

---

## Build Configuration

### Vite Configuration ([vite.config.ts](vite.config.ts))

**Plugins:**
- `@vitejs/plugin-react` - JSX/React support
- `@crxjs/vite-plugin` - Chrome extension build

**Custom Entry File Names:**
```typescript
entryFileNames: (chunkInfo) => {
  if (facadeModuleId.includes('content/script')) return 'content.js';
  if (facadeModuleId.includes('service-worker')) return 'background.js';
  if (facadeModuleId.includes('injector')) return 'injector.js';
  return '[name].js';
}
```

**Build Output Mapping:**
| Source | Output |
|--------|--------|
| src/content/script.ts | content.js |
| src/background/service-worker.ts | background.js |
| src/inject/injector.ts | injector.js |

### Manifest Configuration ([manifest.json](public/manifest.json))

**Permissions:**
- `activeTab` - Access current tab only
- `scripting` - Dynamic script injection
- `storage` - Extension data storage
- `clipboardWrite` - Copy to clipboard

**Host Permissions:**
```json
[
  "https://claude.ai/*",
  "https://chatgpt.com/*",
  "https://gemini.google.com/*",
  "https://grok.com/*",
  "https://www.perplexity.ai/*"
]
```

**Content Scripts:**
1. **Scraper** - Runs on `<all_urls>`
2. **Injector** - Runs on AI platform URLs only

---

## Dependencies

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @mozilla/readability | ^0.5.0 | Content extraction (Firefox Reader Mode algorithm) |
| gpt-tokenizer | ^2.1.2 | Accurate GPT token counting |
| react | ^18.3.1 | UI framework (minimal usage) |
| react-dom | ^18.3.1 | React DOM |
| turndown | ^7.2.0 | HTML to Markdown conversion |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @crxjs/vite-plugin | ^2.3.0 | Vite plugin for Chrome extensions |
| @types/chrome | ^0.0.287 | Chrome API type definitions |
| @vitejs/plugin-react | ^5.1.2 | React support for Vite |
| tailwindcss | ^3.4.15 | Utility-first CSS (minimal usage) |
| typescript | ^5.6.3 | TypeScript compiler |
| vite | ^6.0.1 | Build tool |

### NPM Scripts

```bash
npm run dev      # Development mode with hot reload
npm run build    # TypeScript compile + production build
npm run preview  # Preview production build
```

---

## Security & Privacy

**Data Handling:**
- All processing happens locally in the browser
- No external API calls
- No telemetry or analytics
- Content never leaves user's computer

**Permission Model:**
- `activeTab` - Only accesses current tab when user clicks extension
- Host permissions limited to AI platforms only
- `clipboardWrite` - Only writes, never reads clipboard

**Content Script Isolation:**
- Scraper script runs in isolated world on all pages
- Injector script runs in isolated world on AI platforms only
- No access to page JavaScript variables or functions

---

## Technical Challenges & Solutions

### Challenge 1: React State Manipulation

**Problem:** React-based AI platforms don't respond to simple `element.value` assignment because React manages input state internally.

**Solution:** Dispatch a comprehensive sequence of native DOM events that trigger React's internal change detection:
```typescript
const events = [
  new Event('focus', { bubbles: true }),
  new KeyboardEvent('keydown', { bubbles: true, cancelable: true }),
  new KeyboardEvent('keypress', { bubbles: true, cancelable: true }),
  new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: value }),
  new InputEvent('input', { bubbles: true, cancelable: true }),
  new Event('change', { bubbles: true }),
  new KeyboardEvent('keyup', { bubbles: true, cancelable: true }),
];
```

### Challenge 2: React Initialization Timing

**Problem:** AI platforms use React which requires time to mount after page load.

**Solution:** Two-stage wait:
1. Wait for `tab.status === 'complete'`
2. Additional 1.5 second delay for React to mount
3. 10-second fallback timeout

### Challenge 3: Contenteditable Whitespace

**Problem:** `contenteditable` divs don't preserve newlines when using `textContent`.

**Solution:** Wrap content in a `<pre>` element with `white-space: pre-wrap`:
```typescript
const pre = document.createElement('pre');
pre.style.whiteSpace = 'pre-wrap';
pre.style.fontFamily = 'inherit';
pre.textContent = markdown;
div.appendChild(pre);
```

### Challenge 4: Platform Selector Variability

**Problem:** Different AI platforms use different DOM structures and selectors.

**Solution:** Platform-specific selector arrays with fallbacks:
```typescript
function getTextareaSelector(platform: string): string {
  switch (platform) {
    case 'claude':
      return [
        'textarea[placeholder*="message"]',
        'div[contenteditable="true"]',
        'textarea',
      ].join(', ');
    // ...
  }
}
```

### Challenge 5: ChatGPT Markdown Rendering

**Problem:** The `<pre>` element wrapper used for generic contenteditable injection interferes with ChatGPT's native markdown renderer.

**Solution:** Platform-specific handler that injects plain text directly, letting ChatGPT's own markdown renderer handle the formatting:
```typescript
function injectIntoChatGPT(div: HTMLDivElement, markdown: string): void {
  div.focus();
  div.innerHTML = '';
  div.textContent = markdown;  // Plain text, no wrapper

  const events = [
    new FocusEvent('focus', { bubbles: true }),
    new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: markdown }),
    new InputEvent('input', { bubbles: true, cancelable: true }),
    new Event('change', { bubbles: true }),
    new ClipboardEvent('paste', { bubbles: true, cancelable: true, dataType: 'text/plain', data: markdown }),
  ];

  events.forEach(event => div.dispatchEvent(event));
}
```

### Challenge 6: Gemini Dark Mode Visibility

**Problem:** Injected content in Gemini's dark mode is invisible due to color inheritance issues.

**Solution:** Platform-specific handler that explicitly sets `color: inherit` and handles both contenteditable and textarea elements:
```typescript
function injectIntoGemini(element: HTMLTextAreaElement | HTMLDivElement, markdown: string): void {
  element.focus();

  if (element.tagName === 'DIV' && element.getAttribute('contenteditable') === 'true') {
    const div = element as HTMLDivElement;
    div.innerHTML = '';
    div.textContent = markdown;

    // Set explicit color for dark mode visibility
    div.style.color = 'inherit';

    // ... dispatch events
  } else {
    // For textarea - use standard React events
    (element as HTMLTextAreaElement).value = markdown;
    dispatchReactInputEvents(element, markdown);
  }
}
```

---

## File Reference Summary

| File | Lines | Purpose |
|------|-------|---------|
| [service-worker.ts](src/background/service-worker.ts) | 147 | Background coordination |
| [script.ts](src/content/script.ts) | 95 | Content scraping |
| [injector.ts](src/inject/injector.ts) | 250 | Content injection (with platform-specific handlers) |
| [popup.ts](src/popup/popup.ts) | 295 | Popup UI controller |
| [popup.html](src/popup.html) | 352 | Popup markup and styles |
| [token-counter.ts](src/utils/token-counter.ts) | 58 | Token counting utility |
| [vite.config.ts](vite.config.ts) | 34 | Build configuration |
| [manifest.json](public/manifest.json) | 57 | Extension manifest |

---

*Documentation generated for MDify v1.0.0*
