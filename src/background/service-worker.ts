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
type InjectionFailureReason =
  | 'no_input_found'
  | 'input_not_visible'
  | 'input_not_editable'
  | 'injection_exception'
  | 'runtime_error'
  | 'timeout'
  | 'unknown';

interface InjectionAttemptResult {
  success: boolean;
  reason?: InjectionFailureReason;
}

interface InjectionResponse {
  success: boolean;
  url?: string;
  reason?: InjectionFailureReason;
  attempts?: number;
}

// Platform URLs
const PLATFORM_URLS: Record<Platform, string> = {
  claude: 'https://claude.ai/new',
  chatgpt: 'https://chatgpt.com/',
  gemini: 'https://gemini.google.com/',
  grok: 'https://grok.com/',
  perplexity: 'https://www.perplexity.ai/',
};

const REACT_MOUNT_DELAY_MS = 1500;
const INJECTION_RETRY_DELAY_MS = 1400;
const MAX_INJECTION_ATTEMPTS = 5;
const INJECTION_TIMEOUT_MS = 15000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function sendInjectionMessage(tabId: number, request: InjectionRequest): Promise<InjectionAttemptResult> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(
      tabId,
      {
        action: 'injectContent',
        markdown: request.markdown,
        platform: request.platform,
      },
      (response?: InjectionAttemptResult) => {
        if (chrome.runtime.lastError) {
          console.warn('MDify: Injection message failed:', chrome.runtime.lastError.message);
          resolve({ success: false, reason: 'runtime_error' });
          return;
        }

        if (response?.success) {
          resolve({ success: true });
          return;
        }

        resolve({ success: false, reason: response?.reason || 'unknown' });
      }
    );
  });
}

/**
 * Opens a new tab and waits for it to fully load before injecting content
 */
async function openAndInject(
  request: InjectionRequest
): Promise<{ success: boolean; reason?: InjectionFailureReason; attempts: number }> {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (result: { success: boolean; reason?: InjectionFailureReason; attempts: number }): void => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    // Open the target URL in a new tab
    chrome.tabs.create({ url: request.targetUrl, active: true }, (tab) => {
      if (!tab.id) {
        finish({ success: false, reason: 'runtime_error', attempts: 0 });
        return;
      }

      const tabId = tab.id;

      // Set up a listener for when the tab completes loading
      const listener = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
          // Remove the listener
          chrome.tabs.onUpdated.removeListener(listener);
          clearTimeout(timeoutId);

          void (async () => {
            await wait(REACT_MOUNT_DELAY_MS);

            let lastReason: InjectionFailureReason = 'unknown';

            for (let attempt = 1; attempt <= MAX_INJECTION_ATTEMPTS; attempt += 1) {
              const attemptResult = await sendInjectionMessage(tabId, request);

              if (attemptResult.success) {
                finish({ success: true, attempts: attempt });
                return;
              }

              lastReason = attemptResult.reason || 'unknown';

              if (attempt < MAX_INJECTION_ATTEMPTS) {
                await wait(INJECTION_RETRY_DELAY_MS);
              }
            }

            finish({
              success: false,
              reason: lastReason,
              attempts: MAX_INJECTION_ATTEMPTS,
            });
          })();
        }
      };

      chrome.tabs.onUpdated.addListener(listener);

      // Fallback timeout in case the target app never reaches a usable state
      const timeoutId = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        finish({ success: false, reason: 'timeout', attempts: 0 });
      }, INJECTION_TIMEOUT_MS);
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
async function handleInjection(platform: Platform, markdown: string): Promise<InjectionResponse> {
  if (!(platform in PLATFORM_URLS)) {
    return { success: false, reason: 'unknown', attempts: 0 };
  }

  const targetUrl = PLATFORM_URLS[platform];

  const result = await openAndInject({
    targetUrl,
    markdown,
    platform,
  });

  return {
    success: result.success,
    url: targetUrl,
    reason: result.reason,
    attempts: result.attempts,
  };
}
