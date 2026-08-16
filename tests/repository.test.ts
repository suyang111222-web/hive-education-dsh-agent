import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('repository handoff documentation', () => {
  it('marks the HTTP contract as reserved instead of implemented', () => {
    const openapi = readFileSync('docs/contracts/openapi.yaml', 'utf8');
    const readme = readFileSync('README.md', 'utf8');
    expect(openapi).toContain('当前仓库未实现这些 HTTP 路由');
    expect(openapi).toContain('/v1/learning/doubts:');
    expect(openapi).toContain('/v1/teaching/asset-jobs:');
    expect(openapi).toContain('/v1/events:');
    expect(readme).toContain('executionMode=stub');
    expect(readme).toContain('不证明教学效果或生产可用性');
  });

  it('does not claim that a real model or classroom was executed', () => {
    const evidence = readFileSync('docs/compliance-and-evidence.md', 'utf8');
    expect(evidence).toContain('未调用真实大模型');
    expect(evidence).toContain('未进行真实课堂试点');
  });
});
