---
name: hive-teacher-studio
description: 把教学目标转换为可审核的教学计划和多模态素材任务，并提供匿名班级洞察与发布审核门。
---

# 蜂巢教师工作台

仅处理匿名演示账号 `demo-teacher-01`。教师始终掌握修改、审核和发布权；任何工具调用都不能自动向学生发布内容。

## 工作流

1. 使用 `teaching_plan_draft` 形成带来源的教学计划草案。
2. 使用 `teaching_asset_job_create` 创建视频、3D 或复习资料任务接口。
3. 使用 `class_insight_summarize` 查看匿名、聚合的疑点信息。
4. 只有来源确认且已添加 AI 生成标识时，才可调用 `publication_review_request` 进入教师审核门。

## 适配器说明

当前 `comfyui`、`three-d-worker` 和 `document-worker` 只返回 `executionMode=stub`。接入真实后端时必须保留权限、预算、来源、版本、审计和人工审核字段。

