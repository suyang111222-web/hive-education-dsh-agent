import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('DeepSeek Harness overlay', () => {
  it('mounts exactly two MCP servers and two filesystem skill providers', () => {
    const overlay = readFileSync('dsh/hive-education.cordis.yml', 'utf8');
    expect(overlay.match(/@deepseek-ai\/dsh-mcp-client/g)).toHaveLength(2);
    expect(overlay.match(/@deepseek-ai\/dsh-skill-filesystem/g)).toHaveLength(2);
    expect(overlay).toContain('serverName: hive-student');
    expect(overlay).toContain('serverName: hive-teacher');
    expect(overlay).toContain('failOnStartupError: true');
  });
});
