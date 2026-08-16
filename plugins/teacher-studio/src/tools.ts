import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import {
  TeacherActorSchema,
  frontendEvent,
  type AssetJob,
  type HivePorts,
} from '../../../packages/contracts/src/index.js';
import { stableId, success } from '../../../packages/runtime/src/mcp.js';

const names = [
  'teaching_plan_draft',
  'teaching_asset_job_create',
  'class_insight_summarize',
  'publication_review_request',
] as const;
type TeacherToolName = (typeof names)[number];
type ObjectSchema = z.ZodObject<z.ZodRawShape>;

const lessonInput = TeacherActorSchema.extend({ lessonId: z.string().min(1) }).strict();
const planInput = lessonInput.extend({ teachingGoal: z.string().min(1).max(1000) }).strict();
const assetInput = lessonInput.extend({
  assetType: z.enum(['VIDEO', 'THREE_D', 'SUMMARY']),
  brief: z.string().min(1).max(2000),
}).strict();
const reviewInput = lessonInput.extend({
  assetId: z.string().min(1),
  sourceConfirmed: z.boolean(),
  aiDisclosureApplied: z.boolean(),
}).strict().superRefine(({ sourceConfirmed, aiDisclosureApplied }, ctx) => {
  if (!sourceConfirmed) ctx.addIssue({ code: 'custom', path: ['sourceConfirmed'], message: 'sourceConfirmed must be true' });
  if (!aiDisclosureApplied) ctx.addIssue({ code: 'custom', path: ['aiDisclosureApplied'], message: 'aiDisclosureApplied must be true' });
});

const eventSchema = z.object({
  version: z.literal('v1'),
  type: z.string().min(1),
  aggregateId: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
}).strict();

interface Definition {
  name: TeacherToolName;
  description: string;
  inputSchema: ObjectSchema;
  outputSchema: ObjectSchema;
  handler(input: unknown): Promise<CallToolResult>;
}

async function ensureLesson(ports: HivePorts, lessonId: string) {
  const lesson = await ports.lessonContent.getLesson(lessonId);
  if (!lesson) throw new Error(`Unknown lessonId: ${lessonId}`);
  return lesson;
}

function adapterTarget(assetType: AssetJob['assetType']): AssetJob['adapterTarget'] {
  if (assetType === 'VIDEO') return 'comfyui';
  if (assetType === 'THREE_D') return 'three-d-worker';
  return 'document-worker';
}

function definitions(ports: HivePorts): Definition[] {
  return [
    {
      name: 'teaching_plan_draft',
      description: 'Draft a source-linked teaching plan; never publishes automatically.',
      inputSchema: planInput,
      outputSchema: z.object({
        planId: z.string().min(1),
        status: z.literal('DRAFT'),
        stages: z.array(z.string().min(1)).min(1),
        source: z.string().min(1),
        requiresTeacherReview: z.literal(true),
        event: eventSchema,
      }).strict(),
      handler: async (input) => {
        const parsed = planInput.parse(input);
        const lesson = await ensureLesson(ports, parsed.lessonId);
        const planId = stableId('plan', [parsed.lessonId]);
        const stages = ['明确教学目标与依据', '选择讲解和可视化形式', '安排形成性检查', '教师审核后发布'];
        await ports.teachingPlans.saveDraft({
          id: planId,
          lessonId: parsed.lessonId,
          teachingGoal: parsed.teachingGoal,
          stages,
          status: 'DRAFT',
          requiresTeacherReview: true,
        });
        const event = frontendEvent('teaching.plan.drafted', parsed.lessonId, { planId });
        return success('已生成教学计划草案，须由教师审核。', {
          planId,
          status: 'DRAFT',
          stages,
          source: lesson.source.locator,
          requiresTeacherReview: true,
          event,
        });
      },
    },
    {
      name: 'teaching_asset_job_create',
      description: 'Queue a placeholder video, 3D, or summary job for a future backend adapter.',
      inputSchema: assetInput,
      outputSchema: z.object({
        jobId: z.string().min(1),
        status: z.literal('QUEUED'),
        executionMode: z.literal('stub'),
        adapterTarget: z.enum(['comfyui', 'three-d-worker', 'document-worker']),
        event: eventSchema,
      }).strict(),
      handler: async (input) => {
        const parsed = assetInput.parse(input);
        await ensureLesson(ports, parsed.lessonId);
        const jobId = stableId('job', [parsed.lessonId, parsed.assetType]);
        const target = adapterTarget(parsed.assetType);
        await ports.assetWorkflow.enqueue({
          id: jobId,
          lessonId: parsed.lessonId,
          assetType: parsed.assetType,
          brief: parsed.brief,
          status: 'QUEUED',
          executionMode: 'stub',
          adapterTarget: target,
        });
        const event = frontendEvent('teaching.asset.queued', parsed.lessonId, { jobId, adapterTarget: target });
        return success('已创建素材任务接口记录；本 Demo 不会调用真实生成服务。', {
          jobId,
          status: 'QUEUED',
          executionMode: 'stub',
          adapterTarget: target,
          event,
        });
      },
    },
    {
      name: 'class_insight_summarize',
      description: 'Summarize anonymous fixture doubts without exposing a student identity.',
      inputSchema: lessonInput,
      outputSchema: z.object({
        lessonId: z.string().min(1),
        doubtCount: z.number().int().nonnegative(),
        concepts: z.array(z.string()),
        containsPersonalIdentity: z.literal(false),
        requiresTeacherReview: z.literal(true),
      }).strict(),
      handler: async (input) => {
        const parsed = lessonInput.parse(input);
        await ensureLesson(ports, parsed.lessonId);
        const doubts = await ports.learningRecords.listDoubts(parsed.lessonId);
        return success('已生成匿名班级疑点摘要，供教师确认。', {
          lessonId: parsed.lessonId,
          doubtCount: doubts.length,
          concepts: [...new Set(doubts.map(({ concept }) => concept))],
          containsPersonalIdentity: false,
          requiresTeacherReview: true,
        });
      },
    },
    {
      name: 'publication_review_request',
      description: 'Open the teacher-review gate after source and AI disclosure checks pass.',
      inputSchema: reviewInput,
      outputSchema: z.object({
        reviewId: z.string().min(1),
        status: z.literal('PENDING_TEACHER_REVIEW'),
        sourceConfirmed: z.literal(true),
        aiDisclosureApplied: z.literal(true),
        automaticPublication: z.literal(false),
        event: eventSchema,
      }).strict(),
      handler: async (input) => {
        const parsed = reviewInput.parse(input);
        await ensureLesson(ports, parsed.lessonId);
        const reviewId = stableId('review', [parsed.lessonId, parsed.assetId]);
        await ports.audit.append({ action: 'teacher.publication.review.requested', aggregateId: reviewId });
        const event = frontendEvent('teaching.review.requested', parsed.lessonId, { reviewId });
        return success('已进入教师审核门；不会自动向学生发布。', {
          reviewId,
          status: 'PENDING_TEACHER_REVIEW',
          sourceConfirmed: true,
          aiDisclosureApplied: true,
          automaticPublication: false,
          event,
        });
      },
    },
  ];
}

export function teacherToolNames(): TeacherToolName[] {
  return [...names];
}

export async function callTeacherTool(
  name: string,
  input: unknown,
  ports: HivePorts,
): Promise<CallToolResult> {
  const definition = definitions(ports).find((item) => item.name === name);
  if (!definition) throw new Error(`Unknown teacher tool: ${name}`);
  const parsed = definition.inputSchema.parse(input);
  return definition.handler(parsed);
}

export function registerTeacherTools(server: McpServer, ports: HivePorts): void {
  for (const definition of definitions(ports)) {
    server.registerTool(definition.name, {
      description: definition.description,
      inputSchema: definition.inputSchema,
      outputSchema: definition.outputSchema,
    }, definition.handler);
  }
}

