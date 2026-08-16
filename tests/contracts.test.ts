import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import {
  FrontendEventSchema,
  StudentActorSchema,
  createInMemoryPorts,
} from '../packages/contracts/src/index.js';

describe('shared integration contracts', () => {
  it('accepts only the anonymous demo student', () => {
    expect(StudentActorSchema.parse({ actorId: 'demo-student-01', role: 'student' }))
      .toEqual({ actorId: 'demo-student-01', role: 'student' });
    expect(() => StudentActorSchema.parse({ actorId: '张三', role: 'student' })).toThrow();
  });

  it('keeps future frontend events explicit and versioned', () => {
    expect(FrontendEventSchema.parse({
      version: 'v1',
      type: 'learning.doubt.created',
      aggregateId: 'lesson-session-demo-01',
      payload: { doubtId: 'doubt-001' },
    }).type).toBe('learning.doubt.created');
  });

  it('provides replaceable in-memory backend ports for the fixture demo', async () => {
    const ports = createInMemoryPorts();
    const lesson = await ports.lessonContent.getLesson('lesson-em-01');
    expect(lesson?.topic).toBe('电磁感应与楞次定律');
    await ports.audit.append({ action: 'fixture.read', aggregateId: 'lesson-em-01' });
    expect(await ports.audit.list()).toHaveLength(1);
  });

  it('keeps the tracked fixture aligned with the in-memory adapter', async () => {
    const fixture = JSON.parse(readFileSync('fixtures/electromagnetism/lesson.json', 'utf8'));
    const lesson = await createInMemoryPorts().lessonContent.getLesson('lesson-em-01');
    expect(lesson).toMatchObject({
      id: fixture.id,
      grade: fixture.grade,
      subject: fixture.subject,
      topic: fixture.topic,
      keyConcepts: fixture.keyConcepts,
      teacherApproved: fixture.teacherApproved,
      source: fixture.source,
      fixtureReplay: fixture.fixtureReplay,
    });
  });
});
