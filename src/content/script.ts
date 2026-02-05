/**
 * Content Script - The Scraper
 *
 * This script runs on every webpage to extract the main content
 * using @mozilla/readability and convert it to Markdown using Turndown.
 */

import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';

// Initialize Turndown with GitHub Flavored Markdown options
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '_',
});

// Add table support
turndownService.addRule('table', {
  filter: ['table'],
  replacement: function (content) {
    return '\n\n' + content + '\n\n';
  },
});

/**
 * Scrapes the current page and converts it to clean Markdown
 * @returns The scraped Markdown content or null if failed
 */
export function scrapePageToMarkdown(): string | null {
  try {
    // Clone the document to work with a clean copy
    const documentClone = document.cloneNode(true) as Document;

    // Use Readability to extract the main content
    const readability = new Readability(documentClone, {
      charThreshold: 100,
    });

    const article = readability.parse();

    if (!article || !article.content) {
      console.warn('MDify: No article content found');
      return null;
    }

    // Convert the cleaned HTML to Markdown
    const markdown = turndownService.turndown(article.content);

    // Add metadata at the top
    const metadata = `---
title: ${article.title || document.title}
url: ${window.location.href}
excerpt: ${article.excerpt || ''}
---

# ${article.title || document.title}

`;

    return metadata + markdown;
  } catch (error) {
    console.error('MDify: Error scraping page:', error);
    return null;
  }
}

/**
 * Get page title
 */
export function getPageTitle(): string {
  return document.title;
}

/**
 * Get page URL
 */
export function getPageUrl(): string {
  return window.location.href;
}

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'scrapePage') {
    const markdown = scrapePageToMarkdown();
    sendResponse({
      markdown,
      title: getPageTitle(),
      url: getPageUrl(),
    });
  }
  return true;
});


/**
 * Floating Button Implementation
 */

function injectFloatingButton() {
  // Don't inject on AI platforms themselves
  const aiPlatforms = ['claude.ai', 'chatgpt.com', 'gemini.google.com', 'grok.com', 'perplexity.ai'];
  const currentHost = window.location.hostname;
  if (aiPlatforms.some(platform => currentHost.includes(platform))) {
    return;
  }

  // Sites to exclude (Video, Social, Productivity)
  const excludedDomains = [
    // Video & Streaming (Full screen issues)
    'youtube.com', 'youtu.be', 'netflix.com', 'twitch.tv', 'vimeo.com',
    'dailymotion.com', 'disneyplus.com', 'hulu.com', 'primevideo.com', 'max.com',
    // Social Media
    'twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'tiktok.com', 'linkedin.com',
    // Communication
    'whatsapp.com', 'messenger.com', 'discord.com', 'slack.com',
    'teams.microsoft.com', 'zoom.us', 'meet.google.com',
    // Productivity & Design
    'docs.google.com', 'sheets.google.com', 'slides.google.com',
    'canva.com', 'figma.com', 'trello.com', 'miro.com'
  ];

  if (excludedDomains.some(domain => currentHost.includes(domain))) {
    console.log('MDify: Overlay disabled on this domain');
    return;
  }

  // Check if already injected
  if (document.getElementById('mdify-floating-root')) return;

  const root = document.createElement('div');
  root.id = 'mdify-floating-root';
  root.className = 'mdify-animate-in';

  root.innerHTML = `
    <div class="mdify-menu" id="mdify-menu">
      <div class="mdify-menu-header">AI Platforms</div>
      <div class="mdify-menu-item" data-platform="claude">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
        Claude
      </div>
      <div class="mdify-menu-item" data-platform="chatgpt">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
        ChatGPT
      </div>
      <div class="mdify-menu-item" data-platform="gemini">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
        Gemini
      </div>
      <div class="mdify-menu-item" data-platform="grok">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
        Grok
      </div>
      <div class="mdify-menu-item" data-platform="perplexity">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
        Perplexity
      </div>
      
      <div class="mdify-divider"></div>
      <div class="mdify-menu-item" data-action="copy">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        Copy Markdown
      </div>
      <div class="mdify-menu-item" data-action="download">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line></svg>
        Download .md
      </div>
    </div>
    <button class="mdify-fab" id="mdify-fab" title="Open with MDify">
      <svg class="mdify-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
        <path d="m2 17 10 5 10-5"></path>
        <path d="m2 12 10 5 10-5"></path>
      </svg>
    </button>
  `;

  document.body.appendChild(root);

  const fab = document.getElementById('mdify-fab')!;
  const menu = document.getElementById('mdify-menu')!;

  // Drag functionality
  let isDragging = false;
  let hasMoved = false;
  let startX: number, startY: number;
  let initialLeft: number, initialTop: number;

  fab.addEventListener('mousedown', (e) => {
    // Only left click
    if (e.button !== 0) return;

    isDragging = true;
    hasMoved = false;
    startX = e.clientX;
    startY = e.clientY;

    const rect = root.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    // Set absolute position based on current visual position
    root.style.bottom = 'auto';
    root.style.right = 'auto';
    root.style.left = `${initialLeft}px`;
    root.style.top = `${initialTop}px`;

    fab.style.cursor = 'grabbing';

    // Prevent selection
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    // Threshold to consider it a drag
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMoved = true;
    }

    if (hasMoved) {
      root.style.left = `${initialLeft + dx}px`;
      root.style.top = `${initialTop + dy}px`;
    }
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      fab.style.cursor = 'pointer';
    }
  });

  fab.addEventListener('click', (e) => {
    e.stopPropagation();

    // If it was a drag, don't toggle menu
    if (hasMoved) {
      hasMoved = false;
      return;
    }

    menu.classList.toggle('active');
  });

  document.addEventListener('click', () => {
    menu.classList.remove('active');
  });

  menu.addEventListener('click', async (e) => {
    e.stopPropagation();
    const item = (e.target as HTMLElement).closest('.mdify-menu-item');
    if (!item) return;

    const platform = item.getAttribute('data-platform');
    const action = item.getAttribute('data-action');

    menu.classList.remove('active');

    // Add loading state to FAB
    const originalFabContent = fab.innerHTML;
    fab.innerHTML = '<span class="mdify-spinner"></span>';
    fab.style.pointerEvents = 'none';

    try {
      const markdown = scrapePageToMarkdown();
      if (!markdown) throw new Error('Failed to scrape page');

      // ALWAYS Copy to clipboard
      await navigator.clipboard.writeText(markdown);

      if (platform) {
        await chrome.runtime.sendMessage({
          action: 'injectToPlatform',
          platform,
          markdown,
        });
        fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px;"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      } else if (action === 'copy') {
        fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px;"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      } else if (action === 'download') {
        // Sanitize filename from page title
        const pageTitle = document.title || 'document';
        const filename = pageTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

        // Create blob and download link
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px;"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      }
    } catch (err) {
      console.error('MDify Error:', err);
      fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    } finally {
      setTimeout(() => {
        fab.innerHTML = originalFabContent;
        fab.style.pointerEvents = 'auto';
      }, 2000);
    }
  });
}

// Add CSS to page
function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    #mdify-floating-root {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      font-family: 'Outfit', -apple-system, sans-serif !important;
    }
    .mdify-fab {
      width: 56px;
      height: 56px;
      border-radius: 18px;
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 32px rgba(99, 102, 241, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.1);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      padding: 0;
      position: relative;
      overflow: hidden;
      user-select: none;
    }
    .mdify-fab::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(rgba(255,255,255,0.2), transparent);
      opacity: 0.5;
    }
    .mdify-fab:hover {
      transform: translateY(-2px) scale(1.05);
      box-shadow: 0 12px 40px rgba(99, 102, 241, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.2);
    }
    .mdify-fab:active {
      transform: scale(0.95);
    }
    .mdify-logo-icon { width: 28px; height: 28px; color: white; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); z-index: 1; pointer-events: none; }
    .mdify-menu {
      position: absolute;
      bottom: 76px;
      right: 0;
      background: rgba(15, 15, 20, 0.85);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 10px;
      min-width: 200px;
      opacity: 0;
      transform: translateY(15px) scale(0.9);
      pointer-events: none;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
      transform-origin: bottom right;
    }
    .mdify-menu.active { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
    .mdify-menu-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 12px;
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid transparent;
    }
    .mdify-menu-item:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      transform: translateX(-4px);
      border-color: rgba(255, 255, 255, 0.05);
    }
    .mdify-menu-item svg { width: 18px; height: 18px; opacity: 0.7; transition: opacity 0.2s; }
    .mdify-menu-item:hover svg { opacity: 1; }
    .mdify-menu-header {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.4);
      text-transform: uppercase;
      letter-spacing: 1.5px;
      padding: 8px 14px 4px 14px;
      font-weight: 700;
    }
    .mdify-divider { height: 1px; background: rgba(255, 255, 255, 0.06); margin: 6px 10px; }
    .mdify-spinner {
      width: 24px;
      height: 24px;
      border: 3px solid rgba(255,255,255,0.2);
      border-top-color: white;
      border-radius: 50%;
      animation: mdify-spin 0.8s linear infinite;
    }
    @keyframes mdify-spin { to { transform: rotate(360deg); } }
    .mdify-animate-in { animation: mdify-fade-in 0.5s ease forwards; }
    @keyframes mdify-fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `;
  document.head.appendChild(style);
}

// Initialize
injectStyles();
injectFloatingButton();
