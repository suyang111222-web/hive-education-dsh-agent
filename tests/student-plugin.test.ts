import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it } from 'vitest';

import { createInMemoryPorts } from '../packages/contracts/src/index.js';
import {
  callStudentTool,
  registerStudentTools,
  studentToolNames,
} from '../plugins/student-companion/src/tools.js';

const actor = { actorId: 'demo-student-01', role: 'student' as const };

describe('student companion DSH plugin', () => {
  it('publishes the focused four-tool surface', () => {
    expect(studentToolNames()).toEqual([
      'lesson_context_read',
      'learning_doubt_capture',
      'guided_review_prepare',
      'learning_handoff_create',
    ]);
  });

  it('runs the classroom-to-home fixture flow without leaking answer keys', async () => {
    const ports = createInMemoryPorts();
    const context = await callStudentTool('lesson_context_read', {
      ...actor,
      lessonId: 'lesson-em-01',
    }, ports);
    const doubt = await callStudentTool('learning_doubt_capture', {
      ...actor,
      lessonId: 'lesson-em-01',
      concept: '楞次定律',
      note: '容易把阻碍磁通量变化误解成阻碍运动',
    }, ports);
    const review = await callStudentTool('guided_review_prepare', {
      ...actor,
      lessonId: 'lesson-em-01',
      concept: '楞次定律',
      preferredModality: 'diagram',
    }, ports);
    const handoff = await callStudentTool('learning_handoff_create', {
      ...actor,
      lessonId: 'lesson-em-01',
      target: 'home-agent',
    }, ports);

    const serialized = JSON.stringify([context, doubt, review, handoff]);
    expect(serialized).not.toMatch(/answerKey|标准答案/);
    expect(review.structuredContent).toMatchObject({
      status: 'DRAFT',
      requiresTeacherReview: true,
      fixtureReplay: true,
    });
    expect(handoff.structuredContent).toMatchObject({ target: 'home-agent' });
  });

  it('registers the same tools over a real in-memory MCP transport', async () => {
    const server = new McpServer({ name: 'student-test', version: '0.1.0' });
    registerStudentTools(server, createInMemoryPorts());
    const client = new Client({ name: 'student-client', version: '0.1.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);
      expect((await client.listTools()).tools.map(({ name }) => name)).toEqual(studentToolNames());
      const result = await client.callTool({
        name: 'lesson_context_read',
        arguments: { ...actor, lessonId: 'lesson-em-01' },
      });
      expect(result).toMatchObject({ structuredContent: { fixtureReplay: true } });
    } finally {
      await client.close();
      await server.close();
    }
  });

  it('rejects real-name identifiers and unknown lessons', async () => {
    await expect(callStudentTool('lesson_context_read', {
      actorId: '张三',
      role: 'student',
      lessonId: 'lesson-em-01',
    }, createInMemoryPorts())).rejects.toThrow(/demo-student-01/);
    await expect(callStudentTool('lesson_context_read', {
      ...actor,
      lessonId: 'missing',
    }, createInMemoryPorts())).rejects.toThrow(/Unknown lessonId/);
  });
});
