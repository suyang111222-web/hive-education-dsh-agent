import { createInMemoryPorts } from '../packages/contracts/src/index.js';
import { callStudentTool } from '../plugins/student-companion/src/tools.js';
import { callTeacherTool } from '../plugins/teacher-studio/src/tools.js';

const ports = createInMemoryPorts();
const student = { actorId: 'demo-student-01', role: 'student' as const };
const teacher = { actorId: 'demo-teacher-01', role: 'teacher' as const };

const steps = [
  await callStudentTool('lesson_context_read', {
    ...student,
    lessonId: 'lesson-em-01',
  }, ports),
  await callStudentTool('learning_doubt_capture', {
    ...student,
    lessonId: 'lesson-em-01',
    concept: '楞次定律',
    note: '容易把阻碍磁通量变化误解成阻碍运动',
  }, ports),
  await callStudentTool('guided_review_prepare', {
    ...student,
    lessonId: 'lesson-em-01',
    concept: '楞次定律',
    preferredModality: 'diagram',
  }, ports),
  await callStudentTool('learning_handoff_create', {
    ...student,
    lessonId: 'lesson-em-01',
    target: 'home-agent',
  }, ports),
  await callTeacherTool('class_insight_summarize', {
    ...teacher,
    lessonId: 'lesson-em-01',
  }, ports),
  await callTeacherTool('teaching_plan_draft', {
    ...teacher,
    lessonId: 'lesson-em-01',
    teachingGoal: '用三步可视化帮助学生理解楞次定律',
  }, ports),
  await callTeacherTool('teaching_asset_job_create', {
    ...teacher,
    lessonId: 'lesson-em-01',
    assetType: 'VIDEO',
    brief: '生成 90 秒电磁感应概念动画',
  }, ports),
  await callTeacherTool('publication_review_request', {
    ...teacher,
    lessonId: 'lesson-em-01',
    assetId: 'asset-fixture-001',
    sourceConfirmed: true,
    aiDisclosureApplied: true,
  }, ports),
];

console.log(JSON.stringify({
  demo: '蜂巢教育电磁感应 fixture 回放',
  evidenceBoundary: '本地固定数据；未调用真实模型、前端、数据库或素材生成服务',
  stepCount: steps.length,
  steps: steps.map((result, index) => ({
    index: index + 1,
    message: result.content[0],
    structuredContent: result.structuredContent,
  })),
}, null, 2));

