import { z } from 'zod';

export const StudentActorSchema = z.object({
  actorId: z.literal('demo-student-01'),
  role: z.literal('student'),
}).strict();

export const TeacherActorSchema = z.object({
  actorId: z.literal('demo-teacher-01'),
  role: z.literal('teacher'),
}).strict();

export const SourceRefSchema = z.object({
  title: z.string().min(1),
  sourceType: z.enum(['teacher-provided', 'authorized-course', 'fixture']),
  locator: z.string().min(1),
}).strict();

export const LessonSchema = z.object({
  id: z.string().min(1),
  grade: z.string().min(1),
  subject: z.string().min(1),
  topic: z.string().min(1),
  keyConcepts: z.array(z.string().min(1)).min(1),
  teacherApproved: z.boolean(),
  source: SourceRefSchema,
  fixtureReplay: z.literal(true),
}).strict();

export const FrontendEventSchema = z.object({
  version: z.literal('v1'),
  type: z.enum([
    'learning.doubt.created',
    'learning.review.prepared',
    'learning.handoff.created',
    'teaching.plan.drafted',
    'teaching.asset.queued',
    'teaching.review.requested',
  ]),
  aggregateId: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
}).strict();

export type StudentActor = z.infer<typeof StudentActorSchema>;
export type TeacherActor = z.infer<typeof TeacherActorSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type FrontendEvent = z.infer<typeof FrontendEventSchema>;

export interface DoubtRecord {
  id: string;
  actorId: 'demo-student-01';
  lessonId: string;
  concept: string;
  note: string;
  containsPersonalIdentity: false;
}

export interface HandoffSnapshot {
  id: string;
  lessonId: string;
  actorId: 'demo-student-01';
  target: 'home-agent' | 'classroom-agent';
  doubtIds: string[];
  sourceLocators: string[];
}

export interface TeachingPlanDraft {
  id: string;
  lessonId: string;
  teachingGoal: string;
  stages: string[];
  status: 'DRAFT';
  requiresTeacherReview: true;
}

export interface AssetJob {
  id: string;
  lessonId: string;
  assetType: 'VIDEO' | 'THREE_D' | 'SUMMARY';
  brief: string;
  status: 'QUEUED';
  executionMode: 'stub';
  adapterTarget: 'comfyui' | 'three-d-worker' | 'document-worker';
}

export interface AuditEntry {
  action: string;
  aggregateId: string;
}

export interface LessonContentPort {
  getLesson(id: string): Promise<Lesson | null>;
}

export interface LearningRecordPort {
  addDoubt(record: DoubtRecord): Promise<void>;
  listDoubts(lessonId: string): Promise<DoubtRecord[]>;
  createHandoff(snapshot: HandoffSnapshot): Promise<void>;
}

export interface TeachingPlanPort {
  saveDraft(draft: TeachingPlanDraft): Promise<void>;
}

export interface AssetWorkflowPort {
  enqueue(job: AssetJob): Promise<void>;
}

export interface AuditLogPort {
  append(entry: AuditEntry): Promise<void>;
  list(): Promise<AuditEntry[]>;
}

export interface HivePorts {
  lessonContent: LessonContentPort;
  learningRecords: LearningRecordPort;
  teachingPlans: TeachingPlanPort;
  assetWorkflow: AssetWorkflowPort;
  audit: AuditLogPort;
}

const fixtureLesson: Lesson = LessonSchema.parse({
  id: 'lesson-em-01',
  grade: '高中',
  subject: '高中物理',
  topic: '电磁感应与楞次定律',
  keyConcepts: ['磁通量变化', '楞次定律', '右手螺旋定则'],
  teacherApproved: true,
  source: {
    title: '教师确认的电磁感应演示卡',
    sourceType: 'fixture',
    locator: 'fixtures/electromagnetism/lesson.json',
  },
  fixtureReplay: true,
});

export function createInMemoryPorts(): HivePorts {
  const doubts: DoubtRecord[] = [];
  const handoffs: HandoffSnapshot[] = [];
  const plans: TeachingPlanDraft[] = [];
  const jobs: AssetJob[] = [];
  const auditEntries: AuditEntry[] = [];

  return {
    lessonContent: {
      getLesson: async (id) => id === fixtureLesson.id ? structuredClone(fixtureLesson) : null,
    },
    learningRecords: {
      addDoubt: async (record) => { doubts.push(structuredClone(record)); },
      listDoubts: async (lessonId) => doubts
        .filter((record) => record.lessonId === lessonId)
        .map((record) => structuredClone(record)),
      createHandoff: async (snapshot) => { handoffs.push(structuredClone(snapshot)); },
    },
    teachingPlans: {
      saveDraft: async (draft) => { plans.push(structuredClone(draft)); },
    },
    assetWorkflow: {
      enqueue: async (job) => { jobs.push(structuredClone(job)); },
    },
    audit: {
      append: async (entry) => { auditEntries.push(structuredClone(entry)); },
      list: async () => auditEntries.map((entry) => structuredClone(entry)),
    },
  };
}

export function frontendEvent(
  type: FrontendEvent['type'],
  aggregateId: string,
  payload: Record<string, unknown>,
): FrontendEvent {
  return FrontendEventSchema.parse({ version: 'v1', type, aggregateId, payload });
}

