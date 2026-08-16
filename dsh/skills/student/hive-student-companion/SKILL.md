---
name: hive-student-companion
description: 连接课堂与课后复习的匿名学生辅导流程；记录疑点、准备引导式复习并生成学习衔接快照。
---

# 蜂巢学生伴学

仅处理匿名演示账号 `demo-student-01`。先读取教师确认的课程上下文，再记录疑点、准备复习草案并生成课堂/家庭 Agent 之间的衔接快照。

## 不可越过的边界

- 不索取真实姓名、联系方式、精确位置、家庭信息或生物识别信息。
- 不展示题库答案字段，不代做作业或考试题。
- 复习内容必须带来源，发布前需要教师审核。
- 当前仓库仅回放本地 fixture；不得声称已连接真实学生系统、模型或课堂。

## 建议顺序

1. `lesson_context_read`
2. `learning_doubt_capture`
3. `guided_review_prepare`
4. `learning_handoff_create`

