import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export function success(
  message: string,
  structuredContent: Record<string, unknown>,
): CallToolResult {
  return {
    content: [{ type: 'text', text: message }],
    structuredContent,
  };
}

export function stableId(prefix: string, parts: string[]): string {
  const normalized = parts.join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `${prefix}-${normalized.replace(/^-|-$/g, '').slice(0, 48) || 'fixture'}`;
}

