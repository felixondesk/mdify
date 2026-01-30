/**
 * Background Service Worker
 *
 * Handles:
 * - Opening new tabs for AI platforms
 * - Managing message passing between popup and content scripts
 * - Coordinating the injection workflow
 * - IDE deep-linking
 */

import { countTokens } from '../utils/token-counter';

interface InjectionRequest {
  targetUrl: string;
  markdown: string;
  platform: string;
}

type Platform = 'claude' | 'chatgpt' | 'gemini' | 'grok' | 'perplexity';

// Platform URLs
const PLATFORM_URLS: Record<Platform, string> = {
  claude: 'https://claude.ai/new',
  chatgpt: 'https://chatgpt.com/',
  gemini: 'https://gemini.google.com/',
  grok: 'https://grok.com/',
  perplexity: 'https://www.perplexity.ai/',
};

/**
 * Opens a new tab and waits for it to fully load before injecting content
 */
async function openAndInject(request: InjectionRequest): Promise<boolean> {
  return new Promise((resolve) => {
    // Open the target URL in a new tab
    chrome.tabs.create({ url: request.targetUrl, active: true }, (tab) => {
      if (!tab.id) {
        resolve(false);
        return;
      }

      // Set up a listener for when the tab completes loading
      const listener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
        if (tabId === tab.id && changeInfo.status === 'complete') {
          // Remove the listener
          chrome.tabs.onUpdated.removeListener(listener);

          // Give React a moment to initialize
          setTimeout(() => {
            // Send injection request to the content script
            chrome.tabs.sendMessage(
              tab.id!,
              {
                action: 'injectContent',
                markdown: request.markdown,
                platform: request.platform,
              },
              (response) => {
                if (chrome.runtime.lastError) {
                  console.error('MDify: Injection failed:', chrome.runtime.lastError);
                  resolve(false);
                } else {
                  resolve(response?.success || false);
                }
              }
            );
          }, 1500); // Wait for React to mount
        }
      };

      chrome.tabs.onUpdated.addListener(listener);

      // Fallback: timeout after 10 seconds
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(false);
      }, 10000);
    });
  });
}

/**
 * Handle messages from popup
 */
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  switch (request.action) {
    case 'injectToPlatform':
      handleInjection(request.platform, request.markdown).then(sendResponse);
      return true;


    case 'countTokens':
      const count = countTokens(request.markdown);
      sendResponse({ count });
      break;
  }
  return false;
});

/**
 * Handle injection workflow
 */
async function handleInjection(platform: Platform, markdown: string): Promise<{ success: boolean; url?: string }> {
  const targetUrl = PLATFORM_URLS[platform];

  const success = await openAndInject({
    targetUrl,
    markdown,
    platform,
  });

  return { success, url: targetUrl };
}
