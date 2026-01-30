
import { formatTokenCount } from './utils/token-counter';

// DOM Elements
const loadingEl = document.getElementById('loading')!;
const contentContainerEl = document.getElementById('content-container')!;
const pageTitleEl = document.getElementById('page-title')!;
const pageUrlEl = document.getElementById('page-url')!;
const tokenCountEl = document.getElementById('token-count')!;
const tokenProgressEl = document.getElementById('token-progress') as unknown as SVGCircleElement;

// Buttons
const btnClaude = document.getElementById('btn-claude') as HTMLButtonElement;
const btnChatGPT = document.getElementById('btn-chatgpt') as HTMLButtonElement;
const btnGemini = document.getElementById('btn-gemini') as HTMLButtonElement;
const btnGrok = document.getElementById('btn-grok') as HTMLButtonElement;
const btnPerplexity = document.getElementById('btn-perplexity') as HTMLButtonElement;
const btnCopy = document.getElementById('btn-copy') as HTMLButtonElement;
const btnDownload = document.getElementById('btn-download') as HTMLButtonElement;

function init() {
    // Mock Data
    const mockTitle = "Understanding Quantum Computing - Wikipedia";
    const mockUrl = "https://en.wikipedia.org/wiki/Quantum_computing";
    const mockTokenCount = 12450;

    // Update UI
    pageTitleEl.textContent = mockTitle;
    pageUrlEl.textContent = mockUrl;
    tokenCountEl.textContent = formatTokenCount(mockTokenCount);

    // Circle Progress
    const circumference = 2 * Math.PI * 28;
    const maxTokens = 150000;
    const percentage = Math.min(mockTokenCount / maxTokens, 1);
    const offset = circumference - (percentage * circumference);

    tokenProgressEl.style.strokeDasharray = `${circumference}`;
    tokenProgressEl.style.strokeDashoffset = `${offset}`;
    tokenProgressEl.style.stroke = '#10b981'; // Green
    tokenCountEl.style.color = '#10b981';

    // Enable Buttons
    [btnClaude, btnChatGPT, btnGemini, btnGrok, btnPerplexity, btnCopy, btnDownload].forEach(btn => {
        if (btn) btn.disabled = false;
    });

    // Show Content
    loadingEl.classList.add('hidden');
    contentContainerEl.classList.remove('hidden');
}

init();
