# 前后端预留接口

本仓库没有实现 Web UI 或业务 API。`docs/contracts/openapi.yaml` 是未来前端/网关的稳定边界，MCP 工具则是 DSH 内部编排边界。

## 前端约定

- 命令使用 HTTP JSON；长任务状态使用 SSE 或等价事件通道。
- 所有事件包含 `version`、`type`、`aggregateId` 和 `payload`。
- 学生可见 DTO 不得包含答案、解析、真实身份或内部提示词。
- UI 必须显示来源、fixture/AI 标识、草案状态和教师审核状态。

## 后端适配约定

- 账号系统把真实身份转换为服务内匿名 `actorId`，插件不接触姓名。
- 数据库实现 `LearningRecordPort` 后，学生和教师两个 MCP 进程才能共享疑点与洞察。
- ComfyUI/3D/文档服务只接受结构化任务，并返回任务 ID、状态、成本、模型/工作流版本和输出来源。
- 发布服务必须验证 `sourceConfirmed=true`、`aiDisclosureApplied=true` 和教师人工确认；插件本身没有自动发布能力。

