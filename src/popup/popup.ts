/**
 * Popup Script - Main Controller (World-Class UI Edition)
 */

import { countTokens, getTokenStatus, formatTokenCount } from '../utils/token-counter';

// Platform and IDE types
type Platform = 'claude' | 'chatgpt' | 'gemini' | 'grok' | 'perplexity';

// DOM Elements
const loadingEl = document.getElementById('loading')!;
const contentContainerEl = document.getElementById('content-container')!;
const errorContainerEl = document.getElementById('error-container')!;

// Info Elements
const pageTitleEl = document.getElementById('page-title')!;
const pageUrlEl = document.getElementById('page-url')!;
const tokenCountEl = document.getElementById('token-count')!;
const tokenProgressEl = document.getElementById('token-progress') as unknown as SVGCircleElement;

// AI Platform Buttons
const btnClaude = document.getElementById('btn-claude') as HTMLButtonElement;
const btnChatGPT = document.getElementById('btn-chatgpt') as HTMLButtonElement;
const btnGemini = document.getElementById('btn-gemini') as HTMLButtonElement;
const btnGrok = document.getElementById('btn-grok') as HTMLButtonElement;
const btnPerplexity = document.getElementById('btn-perplexity') as HTMLButtonElement;


const btnCopy = document.getElementById('btn-copy') as HTMLButtonElement;
const btnDownload = document.getElementById('btn-download') as HTMLButtonElement;

// State
let currentMarkdown: string | null = null;
let pageTitle = '';
let pageUrl = '';

/**
 * Initialize the popup
 */
async function init(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.id) {
      showError('Unable to access current tab');
      transitionToContent();
      return;
    }

    // Check for restricted pages where content scripts cannot run
    if (tab.url && (
      tab.url.startsWith('chrome://') ||
      tab.url.startsWith('edge://') ||
      tab.url.includes('chromewebstore.google.com') ||
      tab.url.includes('chrome.google.com/webstore')
    )) {
      showError('Cannot scrape Chrome Web Store or browser internal pages due to security restrictions.');
      transitionToContent();
      return;
    }

    // Send scrape request to content script
    chrome.tabs.sendMessage(
      tab.id,
      { action: 'scrapePage' },
      (response) => {
        if (chrome.runtime.lastError) {
          showError('Unable to scrape this page. Try refreshing or navigating to a different page.');
          transitionToContent();
          return;
        }

        if (!response || !response.markdown) {
          showError('No content found on this page. This might be a protected page or empty document.');
          transitionToContent();
          return;
        }

        currentMarkdown = response.markdown;
        pageTitle = response.title || 'Untitled';
        pageUrl = response.url || '';

        updateUI();
        transitionToContent();
      }
    );
  } catch (error) {
    showError('Failed to initialize: ' + (error as Error).message);
    transitionToContent();
  }
}

/**
 * Update the UI with scraped data
 */
function updateUI(): void {
  if (!currentMarkdown) return;

  // Update page info
  pageTitleEl.textContent = pageTitle;
  pageUrlEl.textContent = pageUrl;

  // Count tokens
  const tokenCount = countTokens(currentMarkdown);
  const status = getTokenStatus(tokenCount);

  // Update token display
  tokenCountEl.textContent = formatTokenCount(tokenCount);

  // Animate Token Progress (Circumference is ~175.9 for r=28)
  const circumference = 2 * Math.PI * 28;
  const maxTokens = 150000; // Reference for progress bar scaling
  const percentage = Math.min(tokenCount / maxTokens, 1);
  const offset = circumference - (percentage * circumference);

  tokenProgressEl.style.strokeDasharray = `${circumference}`;
  tokenProgressEl.style.strokeDashoffset = `${offset}`;

  // Set color based on status
  const colorMap = {
    safe: '#10b981',
    heavy: '#f59e0b',
    critical: '#ef4444'
  };
  tokenProgressEl.style.stroke = colorMap[status.status as keyof typeof colorMap];
  tokenCountEl.style.color = colorMap[status.status as keyof typeof colorMap];

  // Enable all buttons
  const allButtons = [
    btnClaude, btnChatGPT, btnGemini, btnGrok, btnPerplexity,
    btnCopy, btnDownload
  ];
  allButtons.forEach(btn => {
    if (btn) btn.disabled = false;
  });

  // Add subtle warnings for heavy content in the error container
  if (status.status === 'heavy') {
    showWarning('High token count. Some AI models may struggle with this much context.');
  } else if (status.status === 'critical') {
    showWarning('Extremely large context! Recommended to split this content.');
  }
}

/**
 * Smooth transition from loading to content
 */
function transitionToContent(): void {
  loadingEl.style.opacity = '0';
  setTimeout(() => {
    loadingEl.classList.add('hidden');
    contentContainerEl.classList.remove('hidden');
    // Trigger animations in style.css (.animate-fade-in)
  }, 500);
}

/**
 * Show an error message
 */
function showError(message: string): void {
  errorContainerEl.classList.remove('hidden');
  errorContainerEl.innerHTML = `
    <div class="card" style="border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.05);">
      <div style="font-size:12px; color:#f87171; display:flex; gap:8px; align-items:center;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        ${message}
      </div>
    </div>
  `;
}

/**
 * Show a warning message
 */
function showWarning(message: string): void {
  errorContainerEl.classList.remove('hidden');
  errorContainerEl.innerHTML = `
    <div class="card" style="border-color: rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.05); margin-bottom: 24px;">
      <div style="font-size:12px; color:#fbbf24; display:flex; gap:8px; align-items:center;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        ${message}
      </div>
    </div>
  `;
}

/**
 * Generic handler for platform injection
 */
async function injectToPlatform(platform: Platform, button: HTMLButtonElement): Promise<void> {
  if (!currentMarkdown) return;

  const originalContent = button.innerHTML;
  try {
    button.disabled = true;
    button.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;margin:0;"></span>';

    const response = await chrome.runtime.sendMessage({
      action: 'injectToPlatform',
      platform,
      markdown: currentMarkdown,
    });

    if (response?.success) {
      window.close();
    } else {
      showError(`Injection failed for ${platform}.`);
      button.disabled = false;
      button.innerHTML = originalContent;
    }
  } catch (error) {
    showError('Connection error: ' + (error as Error).message);
    button.disabled = false;
    button.innerHTML = originalContent;
  }
}


/**
 * Copy markdown to clipboard
 */
async function copyToClipboard(): Promise<void> {
  if (!currentMarkdown) return;

  const originalContent = btnCopy.innerHTML;
  try {
    await navigator.clipboard.writeText(currentMarkdown);
    btnCopy.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> <span style="color:#10b981">Copied!</span>';
    setTimeout(() => {
      btnCopy.innerHTML = originalContent;
    }, 2000);
  } catch (error) {
    showError('Copy failed');
  }
}

/**
 * Download markdown as .md file
 */
async function downloadMarkdown(): Promise<void> {
  if (!currentMarkdown) return;

  const originalContent = btnDownload.innerHTML;
  try {
    // Sanitize filename from page title
    const filename = (pageTitle || 'document')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Create blob and download link
    const blob = new Blob([currentMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Show success state
    btnDownload.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> <span style="color:#10b981">Downloaded!</span>';
    setTimeout(() => {
      btnDownload.innerHTML = originalContent;
    }, 2000);
  } catch (error) {
    showError('Download failed: ' + (error as Error).message);
  }
}

// Event Listeners
const setupListeners = () => {
  if (btnClaude) btnClaude.addEventListener('click', () => injectToPlatform('claude', btnClaude));
  if (btnChatGPT) btnChatGPT.addEventListener('click', () => injectToPlatform('chatgpt', btnChatGPT));
  if (btnGemini) btnGemini.addEventListener('click', () => injectToPlatform('gemini', btnGemini));
  if (btnGrok) btnGrok.addEventListener('click', () => injectToPlatform('grok', btnGrok));
  if (btnPerplexity) btnPerplexity.addEventListener('click', () => injectToPlatform('perplexity', btnPerplexity));


  if (btnCopy) btnCopy.addEventListener('click', copyToClipboard);
  if (btnDownload) btnDownload.addEventListener('click', downloadMarkdown);
};

setupListeners();
init();
