# 蜂巢教育 DSH Agent

基于 DeepSeek Harness 的两个轻量教育插件原型：一个连接学生课中疑点与课后复习，一个帮助教师把教学目标转成可审核的计划和多模态素材任务。当前只实现 DSH/MCP 核心和接口契约，前端、账号、数据库、模型与生成服务均保留可替换接口。

> 当前状态：本地 fixture PoC。没有真实学生数据、真实模型调用、真实课堂结果或自动发布能力。

## 两个插件

### 1. Student Companion

| MCP 工具 | 作用 |
|---|---|
| `lesson_context_read` | 读取教师确认的课程上下文 |
| `learning_doubt_capture` | 用匿名账号记录课堂疑点 |
| `guided_review_prepare` | 生成带来源、待教师审核的复习草案 |
| `learning_handoff_create` | 创建课堂 Agent 与家庭 Agent 的衔接快照 |

### 2. Teacher Studio

| MCP 工具 | 作用 |
|---|---|
| `teaching_plan_draft` | 把教学目标转成计划草案 |
| `teaching_asset_job_create` | 创建视频、3D 或资料任务接口 |
| `class_insight_summarize` | 汇总匿名疑点，不暴露学生身份 |
| `publication_review_request` | 核验来源和 AI 标识后进入教师审核门 |

素材任务当前返回 `executionMode=stub`。它只说明未来应调用 `comfyui`、`three-d-worker` 或 `document-worker`，不会伪造真实生成结果。

## 目录

```text
packages/contracts/        共享 DTO、事件和后端 Ports
packages/runtime/          MCP 返回与稳定 fixture ID
plugins/student-companion/ 学生插件
plugins/teacher-studio/    教师插件
dsh/                       Cordis overlay 与两套 DSH Skill
fixtures/                  高中物理固定演示数据
docs/contracts/            未来 HTTP/SSE 契约
scripts/                   fixture Demo 与 DSH 启动脚本
tests/                     契约、工具、MCP transport、DSH 配置测试
```

架构、接口和源材料对齐分别见 [架构说明](docs/architecture.md)、[集成契约](docs/integration-contracts.md) 和 [项目对齐](docs/product-alignment.md)。

## 本地安装与验证

要求 Node.js 24 和 pnpm 11。

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm demo
```

`pnpm demo` 输出 8 步电磁感应 fixture 回放。它不会联网或请求模型。

## 接入 DeepSeek Harness

本仓库按 DeepSeek Harness `0.1.0-rc.5` 的 overlay 结构编写。假设仓库与 `deepseek-harness` 位于同一父目录：

```powershell
.\scripts\start-dsh.ps1 -DumpConfig
.\scripts\start-dsh.ps1
```

也可显式指定 DSH：

```powershell
.\scripts\start-dsh.ps1 -DshRoot 'C:\path\to\deepseek-harness' -DumpConfig
```

启动脚本会先构建项目，并把 DSH 自带的 Node 24 目录加入 `PATH`，因此不会出现 npm 子进程找不到 `node` 的问题。`-DumpConfig` 只验证配置并退出；不启动长驻 Web 服务。

## 前后端如何接入

- 前端：按 `docs/contracts/openapi.yaml` 调用未来网关，并订阅版本化事件；界面必须显示来源、fixture/AI 标识、草案与审核状态。
- 后端：实现 `LessonContentPort`、`LearningRecordPort`、`TeachingPlanPort`、`AssetWorkflowPort` 和 `AuditLogPort`，替换 `createInMemoryPorts()`。
- 跨插件共享：两个 stdio MCP 进程必须使用同一数据库/事件后端；内存适配器只适用于测试和单进程 fixture Demo。
- 发布：必须有来源确认、AI 生成标识和教师人工确认，插件没有自动发布路径。

## 安全与证据口径

- 只接受 `demo-student-01` 与 `demo-teacher-01`，防止把真实姓名写进演示数据。
- 学生工具不暴露答案字段，不提供代做或作弊能力。
- 重要内容带来源并停在教师审核门。
- 当前测试只证明接口、状态机、MCP 注册和 DSH 配置；不证明教学效果或生产可用性。

完整边界见 [合规与证据边界](docs/compliance-and-evidence.md)，依赖许可见 [第三方通知](THIRD_PARTY_NOTICES.md)。

