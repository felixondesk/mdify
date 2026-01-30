/**
 * Token Counter Utility
 *
 * Uses gpt-tokenizer for accurate token counting
 */

import { encode } from 'gpt-tokenizer';

/**
 * Count tokens in a text string
 */
export function countTokens(text: string): number {
  if (!text) return 0;
  const tokens = encode(text);
  return tokens.length;
}

/**
 * Get token status based on count
 */
export function getTokenStatus(count: number): {
  status: 'safe' | 'heavy' | 'critical';
  label: string;
  color: string;
} {
  if (count < 25000) {
    return {
      status: 'safe',
      label: 'Safe',
      color: 'green',
    };
  } else if (count < 100000) {
    return {
      status: 'heavy',
      label: 'Heavy Context',
      color: 'orange',
    };
  } else {
    return {
      status: 'critical',
      label: 'Split Required',
      color: 'red',
    };
  }
}

/**
 * Format token count for display
 */
export function formatTokenCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}
