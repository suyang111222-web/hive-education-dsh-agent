import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import {
  LessonSchema,
  StudentActorSchema,
  frontendEvent,
  type HivePorts,
} from '../../../packages/contracts/src/index.js';
import { stableId, success } from '../../../packages/runtime/src/mcp.js';

const names = [
  'lesson_context_read',
  'learning_doubt_capture',
  'guided_review_prepare',
  'learning_handoff_create',
] as const;
type StudentToolName = (typeof names)[number];
type ObjectSchema = z.ZodObject<z.ZodRawShape>;

const lessonInput = StudentActorSchema.extend({ lessonId: z.string().min(1) }).strict();
const doubtInput = lessonInput.extend({
  concept: z.string().min(1),
  note: z.string().min(1).max(500),
}).strict();
const reviewInput = lessonInput.extend({
  concept: z.string().min(1),
  preferredModality: z.enum(['text', 'diagram', 'video', 'three-d']),
}).strict();
const handoffInput = lessonInput.extend({
  target: z.enum(['home-agent', 'classroom-agent']),
}).strict();

const eventSchema = z.object({
  version: z.literal('v1'),
  type: z.string().min(1),
  aggregateId: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
}).strict();

interface Definition {
  name: StudentToolName;
  description: string;
  inputSchema: ObjectSchema;
  outputSchema: ObjectSchema;
  handler(input: unknown): Promise<CallToolResult>;
}

async function requiredLesson(ports: HivePorts, lessonId: string) {
  const lesson = await ports.lessonContent.getLesson(lessonId);
  if (!lesson) throw new Error(`Unknown lessonId: ${lessonId}`);
  if (!lesson.teacherApproved) throw new Error('lesson content requires teacher approval');
  return lesson;
}

function definitions(ports: HivePorts): Definition[] {
  return [
    {
      name: 'lesson_context_read',
      description: 'Read teacher-approved local lesson context for the anonymous fixture student.',
      inputSchema: lessonInput,
      outputSchema: z.object({ lesson: LessonSchema, fixtureReplay: z.literal(true) }).strict(),
      handler: async (input) => {
        const { lessonId } = lessonInput.parse(input);
        const lesson = await requiredLesson(ports, lessonId);
        await ports.audit.append({ action: 'student.lesson.read', aggregateId: lessonId });
        return success('已读取教师确认的本地课程上下文。', { lesson, fixtureReplay: true });
      },
    },
    {
      name: 'learning_doubt_capture',
      description: 'Capture an anonymous classroom doubt without a real student identity.',
      inputSchema: doubtInput,
      outputSchema: z.object({
        doubtId: z.string().min(1),
        containsPersonalIdentity: z.literal(false),
        event: eventSchema,
      }).strict(),
      handler: async (input) => {
        const parsed = doubtInput.parse(input);
        await requiredLesson(ports, parsed.lessonId);
        const doubtId = stableId('doubt', [parsed.lessonId, parsed.concept]);
        await ports.learningRecords.addDoubt({
          id: doubtId,
          actorId: parsed.actorId,
          lessonId: parsed.lessonId,
          concept: parsed.concept,
          note: parsed.note,
          containsPersonalIdentity: false,
        });
        const event = frontendEvent('learning.doubt.created', parsed.lessonId, { doubtId });
        return success('已记录匿名疑点；仅形成后续复习线索。', {
          doubtId,
          containsPersonalIdentity: false,
          event,
        });
      },
    },
    {
      name: 'guided_review_prepare',
      description: 'Prepare a source-linked review draft; a teacher must review it before student publication.',
      inputSchema: reviewInput,
      outputSchema: z.object({
        status: z.literal('DRAFT'),
        lessonId: z.string().min(1),
        concept: z.string().min(1),
        preferredModality: z.enum(['text', 'diagram', 'video', 'three-d']),
        guidanceSteps: z.array(z.string().min(1)).min(1),
        source: z.string().min(1),
        requiresTeacherReview: z.literal(true),
        fixtureReplay: z.literal(true),
        event: eventSchema,
      }).strict(),
      handler: async (input) => {
        const parsed = reviewInput.parse(input);
        const lesson = await requiredLesson(ports, parsed.lessonId);
        const guidanceSteps = [
          '先指出当前情境中正在变化的物理量。',
          '再用图示或文字解释因果链，不直接输出作业结论。',
          '用一项形成性检查收集理解证据，并交由教师复核。',
        ];
        const event = frontendEvent('learning.review.prepared', parsed.lessonId, {
          concept: parsed.concept,
          preferredModality: parsed.preferredModality,
        });
        return success('已形成带来源的复习草案，发布前需要教师审核。', {
          status: 'DRAFT',
          lessonId: parsed.lessonId,
          concept: parsed.concept,
          preferredModality: parsed.preferredModality,
          guidanceSteps,
          source: lesson.source.locator,
          requiresTeacherReview: true,
          fixtureReplay: true,
          event,
        });
      },
    },
    {
      name: 'learning_handoff_create',
      description: 'Create the frontend/backend handoff snapshot between classroom and home agents.',
      inputSchema: handoffInput,
      outputSchema: z.object({
        handoffId: z.string().min(1),
        lessonId: z.string().min(1),
        target: z.enum(['home-agent', 'classroom-agent']),
        doubtIds: z.array(z.string()),
        sourceLocators: z.array(z.string().min(1)),
        event: eventSchema,
      }).strict(),
      handler: async (input) => {
        const parsed = handoffInput.parse(input);
        const lesson = await requiredLesson(ports, parsed.lessonId);
        const doubts = await ports.learningRecords.listDoubts(parsed.lessonId);
        const handoffId = stableId('handoff', [parsed.lessonId, parsed.target]);
        const snapshot = {
          id: handoffId,
          lessonId: parsed.lessonId,
          actorId: parsed.actorId,
          target: parsed.target,
          doubtIds: doubts.map(({ id }) => id),
          sourceLocators: [lesson.source.locator],
        };
        await ports.learningRecords.createHandoff(snapshot);
        const event = frontendEvent('learning.handoff.created', parsed.lessonId, {
          handoffId,
          target: parsed.target,
        });
        return success('已创建匿名学习衔接快照，供未来前后端接入。', {
          handoffId,
          lessonId: parsed.lessonId,
          target: parsed.target,
          doubtIds: snapshot.doubtIds,
          sourceLocators: snapshot.sourceLocators,
          event,
        });
      },
    },
  ];
}

export function studentToolNames(): StudentToolName[] {
  return [...names];
}

export async function callStudentTool(
  name: string,
  input: unknown,
  ports: HivePorts,
): Promise<CallToolResult> {
  const definition = definitions(ports).find((item) => item.name === name);
  if (!definition) throw new Error(`Unknown student tool: ${name}`);
  const parsed = definition.inputSchema.parse(input);
  return definition.handler(parsed);
}

export function registerStudentTools(server: McpServer, ports: HivePorts): void {
  for (const definition of definitions(ports)) {
    server.registerTool(definition.name, {
      description: definition.description,
      inputSchema: definition.inputSchema,
      outputSchema: definition.outputSchema,
    }, definition.handler);
  }
}
