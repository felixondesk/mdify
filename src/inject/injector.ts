/**
 * Injection Helper Script
 *
 * This script runs on Claude.ai and ChatGPT to inject Markdown content
 * into the prompt textarea using React-compatible input events.
 *
 * CRITICAL: Simply setting element.value won't work because React manages
 * the input state internally. We must dispatch native events to trigger
 * React's state updates.
 */

interface InjectMessage {
  action: 'injectContent';
  markdown: string;
  platform: 'claude' | 'chatgpt' | 'gemini' | 'grok' | 'perplexity';
}

type InjectionFailureReason =
  | 'no_input_found'
  | 'input_not_visible'
  | 'input_not_editable'
  | 'injection_exception';

interface InjectionResult {
  success: boolean;
  reason?: InjectionFailureReason;
}

/**
 * Simulates React-compatible input events
 * This is the key to making injection work on React-based sites
 */
function dispatchReactInputEvents(element: HTMLElement, value: string): void {
  const input = element as HTMLTextAreaElement | HTMLInputElement;

  // Focus the element
  input.focus();

  // Set the value
  input.value = value;

  // Create and dispatch the events in the correct order
  const events = [
    new Event('focus', { bubbles: true }),
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true }),
    new KeyboardEvent('keypress', { bubbles: true, cancelable: true }),
    new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: value }),
    new InputEvent('input', { bubbles: true, cancelable: true }),
    new Event('change', { bubbles: true }),
    new KeyboardEvent('keyup', { bubbles: true, cancelable: true }),
  ];

  events.forEach(event => input.dispatchEvent(event));

  // Trigger React's specific internal event if it exists
  const reactEvent = new Event('input', { bubbles: true });
  reactEvent.stopImmediatePropagation = () => { };
  input.dispatchEvent(reactEvent);
}

/**
 * Get the textarea selector for the platform
 */
function getTextareaSelector(platform: string): string {
  switch (platform) {
    case 'claude':
      return [
        'textarea[placeholder*="message"]',
        'textarea[placeholder*="Message"]',
        'div[contenteditable="true"]',
        'textarea[aria-label*="message"]',
        'textarea',
      ].join(', ');

    case 'chatgpt':
      return [
        'textarea[placeholder*="Message"]',
        'textarea[placeholder*="message"]',
        'div[contenteditable="true"]',
        'textarea#prompt-textarea',
        'textarea',
      ].join(', ');

    case 'gemini':
      return [
        'textarea[placeholder*="Enter"]',
        'div[contenteditable="true"]',
        'rich-textarea',
        'textarea',
      ].join(', ');

    case 'grok':
      return [
        'textarea[placeholder*="Ask"]',
        'textarea[placeholder*="ask"]',
        'div[contenteditable="true"]',
        'textarea',
      ].join(', ');

    case 'perplexity':
      return [
        'textarea[placeholder*="Ask"]',
        'div[contenteditable="true"]',
        'textarea',
      ].join(', ');

    default:
      return 'textarea, div[contenteditable="true"]';
  }
}

/**
 * Inject content into a contenteditable div with proper line breaks
 * Generic handler for most platforms
 */
function injectIntoContentEditable(div: HTMLDivElement, markdown: string): void {
  div.focus();

  // Use innerText instead of textContent to preserve line breaks
  // First, clear the content
  div.innerHTML = '';

  // Create text content with proper line breaks
  // Using a pre element preserves whitespace and newlines
  const pre = document.createElement('pre');
  pre.style.whiteSpace = 'pre-wrap';
  pre.style.fontFamily = 'inherit';
  pre.style.margin = '0';
  pre.textContent = markdown;
  div.appendChild(pre);

  // Dispatch comprehensive input events
  const events = [
    new FocusEvent('focus', { bubbles: true }),
    new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: markdown }),
    new InputEvent('input', { bubbles: true, cancelable: true }),
    new Event('change', { bubbles: true }),
  ];

  events.forEach(event => div.dispatchEvent(event));

  // Blur and refocus to ensure React picks up the changes
  div.blur();
  setTimeout(() => div.focus(), 0);
}

/**
 * Inject content for ChatGPT - uses plain text to let ChatGPT's markdown renderer work
 */
function injectIntoChatGPT(div: HTMLDivElement, markdown: string): void {
  div.focus();
  div.innerHTML = '';
  div.textContent = markdown;

  const events = [
    new FocusEvent('focus', { bubbles: true }),
    new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: markdown }),
    new InputEvent('input', { bubbles: true, cancelable: true }),
    new Event('change', { bubbles: true }),
  ];

  events.forEach(event => div.dispatchEvent(event));
  div.blur();
  setTimeout(() => div.focus(), 0);
}

/**
 * Inject content for Gemini - ensures visibility in dark mode
 */
function injectIntoGemini(element: HTMLTextAreaElement | HTMLDivElement, markdown: string): void {
  element.focus();

  if (element.tagName === 'DIV' && element.getAttribute('contenteditable') === 'true') {
    const div = element as HTMLDivElement;
    div.innerHTML = '';
    div.textContent = markdown;

    // Set explicit color for dark mode visibility
    div.style.color = 'inherit';

    const events = [
      new FocusEvent('focus', { bubbles: true }),
      new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: markdown }),
      new InputEvent('input', { bubbles: true, cancelable: true }),
      new Event('change', { bubbles: true }),
    ];

    events.forEach(event => div.dispatchEvent(event));
  } else {
    // For textarea
    (element as HTMLTextAreaElement).value = markdown;
    dispatchReactInputEvents(element, markdown);
  }
}

/**
 * Find and inject content into the textarea
 */
function injectContent(markdown: string, platform: string): InjectionResult {
  const selector = getTextareaSelector(platform);
  const elements = document.querySelectorAll(selector);
  if (elements.length === 0) {
    console.error('MDify: No matching input elements found');
    return { success: false, reason: 'no_input_found' };
  }

  let foundVisibleElement = false;
  let foundVisibleEditableElement = false;
  let hadInjectionError = false;

  for (const element of elements) {
    const textElement = element as HTMLTextAreaElement | HTMLDivElement;

    // Check if element is visible and editable
    const isVisible = textElement.offsetParent !== null;
    const isEditable = textElement.getAttribute('contenteditable') === 'true' ||
      textElement.tagName === 'TEXTAREA';

    if (!isVisible) {
      continue;
    }

    foundVisibleElement = true;

    if (!isEditable) {
      continue;
    }

    foundVisibleEditableElement = true;

    if (isVisible && isEditable) {
      try {
        // Platform-specific injection handlers
        if (platform === 'chatgpt' && textElement.tagName === 'DIV' && textElement.getAttribute('contenteditable') === 'true') {
          injectIntoChatGPT(textElement as HTMLDivElement, markdown);
          console.log(`MDify: Successfully injected ${markdown.length} characters to ChatGPT (contenteditable)`);
          return { success: true };
        }

        if (platform === 'gemini') {
          injectIntoGemini(textElement, markdown);
          console.log(`MDify: Successfully injected ${markdown.length} characters to Gemini`);
          return { success: true };
        }

        // Generic handlers for other platforms
        if (textElement.tagName === 'DIV' && textElement.getAttribute('contenteditable') === 'true') {
          // For contenteditable divs (common in React apps)
          injectIntoContentEditable(textElement as HTMLDivElement, markdown);
          console.log(`MDify: Successfully injected ${markdown.length} characters to ${platform} (contenteditable)`);
          return { success: true };
        } else {
          // For textarea/input elements
          dispatchReactInputEvents(textElement, markdown);
          console.log(`MDify: Successfully injected ${markdown.length} characters to ${platform} (textarea)`);
          return { success: true };
        }
      } catch (error) {
        hadInjectionError = true;
        console.error('MDify: Error during injection:', error);
      }
    }
  }

  if (!foundVisibleElement) {
    console.error('MDify: Input elements found, but none are visible');
    return { success: false, reason: 'input_not_visible' };
  }

  if (!foundVisibleEditableElement) {
    console.error('MDify: Visible element found, but it is not editable');
    return { success: false, reason: 'input_not_editable' };
  }

  if (hadInjectionError) {
    return { success: false, reason: 'injection_exception' };
  }

  console.error('MDify: Injection failed for unknown reason');
  return { success: false, reason: 'injection_exception' };
}

/**
 * Listen for injection messages from background script
 */
chrome.runtime.onMessage.addListener((message: InjectMessage, _sender, sendResponse) => {
  if (message.action === 'injectContent') {
    const result = injectContent(message.markdown, message.platform);
    sendResponse(result);
  }
  return true;
});
