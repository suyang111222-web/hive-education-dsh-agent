import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it } from 'vitest';

import { createInMemoryPorts } from '../packages/contracts/src/index.js';
import {
  callTeacherTool,
  registerTeacherTools,
  teacherToolNames,
} from '../plugins/teacher-studio/src/tools.js';

const actor = { actorId: 'demo-teacher-01', role: 'teacher' as const };

describe('teacher studio DSH plugin', () => {
  it('publishes the focused four-tool surface', () => {
    expect(teacherToolNames()).toEqual([
      'teaching_plan_draft',
      'teaching_asset_job_create',
      'class_insight_summarize',
      'publication_review_request',
    ]);
  });

  it('creates only draft, queued, or pending-review outputs', async () => {
    const ports = createInMemoryPorts();
    const plan = await callTeacherTool('teaching_plan_draft', {
      ...actor,
      lessonId: 'lesson-em-01',
      teachingGoal: '用三步可视化帮助学生理解楞次定律',
    }, ports);
    const job = await callTeacherTool('teaching_asset_job_create', {
      ...actor,
      lessonId: 'lesson-em-01',
      assetType: 'VIDEO',
      brief: '生成 90 秒电磁感应概念动画',
    }, ports);
    const insight = await callTeacherTool('class_insight_summarize', {
      ...actor,
      lessonId: 'lesson-em-01',
    }, ports);
    const review = await callTeacherTool('publication_review_request', {
      ...actor,
      lessonId: 'lesson-em-01',
      assetId: 'asset-fixture-001',
      sourceConfirmed: true,
      aiDisclosureApplied: true,
    }, ports);

    expect(plan.structuredContent).toMatchObject({ status: 'DRAFT', requiresTeacherReview: true });
    expect(job.structuredContent).toMatchObject({ status: 'QUEUED', executionMode: 'stub' });
    expect(insight.structuredContent).toMatchObject({ containsPersonalIdentity: false });
    expect(review.structuredContent).toMatchObject({ status: 'PENDING_TEACHER_REVIEW' });
  });

  it('refuses publication review when source or AI disclosure is missing', async () => {
    await expect(callTeacherTool('publication_review_request', {
      ...actor,
      lessonId: 'lesson-em-01',
      assetId: 'asset-fixture-001',
      sourceConfirmed: false,
      aiDisclosureApplied: true,
    }, createInMemoryPorts())).rejects.toThrow(/sourceConfirmed/);
  });

  it('registers the same definitions over MCP and maps invalid input to an error result', async () => {
    const server = new McpServer({ name: 'teacher-test', version: '0.1.0' });
    registerTeacherTools(server, createInMemoryPorts());
    const client = new Client({ name: 'teacher-client', version: '0.1.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);
      expect((await client.listTools()).tools.map(({ name }) => name)).toEqual(teacherToolNames());
      const failure = await client.callTool({
        name: 'publication_review_request',
        arguments: {
          ...actor,
          lessonId: 'lesson-em-01',
          assetId: 'asset-fixture-001',
          sourceConfirmed: false,
          aiDisclosureApplied: true,
        },
      });
      expect(failure).toMatchObject({ isError: true });
    } finally {
      await client.close();
      await server.close();
    }
  });
});
