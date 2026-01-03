# Family 项目宪法

**生效日期**：2026 年 1 月 3 日  
**版本**：v1.6  
**作者**：项目发起人（家庭核心成员）  
**目的**：本宪法是 Family 项目最高级别的规范，定义项目的核心价值观、不可变原则、技术硬约束和决策框架。所有代码、文档、架构决策（ADR）以及后续变更必须遵守本宪法。除非通过宪法规定的修订程序，否则任何违反宪法的变更无效。本版本整合了 v1.5 的技术严苛标准与家庭核心价值观，确保项目既具宣言式指导性，又有法律级执行力。

## 第一条：项目使命与价值观

1. **使命**：构建一个安全、私密、实用的家庭数字中心，用于管理健康记录、菜谱、旅行攻略和知识库，帮助家庭成员提升生活质量。
2. **核心价值观**：
   - **隐私至上**：家庭数据属于家庭，优先本地化存储，拒绝不必要的云端依赖。
   - **简单实用**：功能设计以家庭实际需求为导向，避免过度工程化或追求潮流。
   - **长期可持续**：技术选型注重稳定、可维护性，支持平滑演进（例如从云端 AI 过渡到本地 AI）。
   - **开放包容**：鼓励家庭成员平等参与贡献，未来若开源，也欢迎社区友好反馈。
   - **理性决策**：所有重大变更必须记录 ADR（架构决策记录），并符合本宪法。
   - **严苛性原则**：技术标准必须强制执行，优先系统稳定性和可审计性，禁止任何形式的技术债务积累。

## 第二条：硬性技术标准（The Manifesto）

### 2.1 架构解耦准则（法律级）

1) 业务逻辑与 AI 供应商隔离  
   - 业务代码禁止直接调用任何模型 SDK/客户端（云端或本地）。  
   - 必须通过 AIProvider 统一接口，经由 services/ai-gateway 提供能力。  

2) 前后端分离  
   - 后端仅提供 JSON API。  
   - 前端只通过 API 取数/写入，不共享后端内部逻辑。  

3) 模块边界清晰  
   - 每个业务域独立模块：健康/菜谱/旅行/笔记等。  
   - 禁止把所有接口堆在单一文件中。  

### 2.2 数据交换准则（Schema First）

1) 结构化输出  
   - AI 输出必须为结构化 JSON，并通过 Schema 校验（Zod / Pydantic）。  
   - 不合格则后端拦截并重试/降级，禁止脏数据传给前端或直接入库。  

2) 数据库唯一真理  
   - PostgreSQL 是唯一权威状态。  
   - Redis/本地缓存只用于加速与体验，不可成为主状态。  

3) 契约引用红线（禁止手写 DTO 漂移）  
   - 所有 API 入参/出参类型必须从 packages/schemas 的 Zod Schema 推导（例如 z.infer<typeof Schema> ）。  
   - 禁止在 apps/api 内另写“权威 DTO”。如需 DTO，只能做薄封装并复用 Schema。  

4) AI 错误契约（硬性）  
   - 所有 AI 相关错误必须输出 AIErrorResponseSchema 形态。  
   - 错误码必须来自 AIErrorCode （ packages/schemas ），禁止手写字符串漂移。  
   - 任何异常必须在进入 API/Worker 之前被 AI Gateway 规整为结构化错误。  

### 2.3 部署与环境准则

1) 一切皆 Docker  
   - 本地开发环境必须与 NAS 运行环境高度一致（Compose 分层）。  

2) 配置外部化  
   - 密钥、密码、路径等必须通过 env 注入。  
   - 必须提供 .env.example ，真实 .env 禁止入库。  

### 2.4 扩展性预留

- 模块化目录：功能必须独立模块文件夹。  
- AI 可替换：一期云端，二期本地，仅允许在 ai-gateway 内切换 provider。  

### 2.5 推进规则（硬性）

- 你不说“下一步”，不执行下一步。  
- 一步一产物、变更先改宪法再动工。  

### 2.6 全链路追踪（硬性）

- 所有可执行服务（API / Worker / AI Gateway）必须在 Middleware 层提取或生成 x-request-id 。  
- 必须在响应头中回传 x-request-id ，并透传到下游请求。  
- 日志必须记录该 ID，作为跨服务排障的最小索引。  

### 2.7 重试政策（硬性）

- AI 相关重试策略必须遵循 docs/adr/retry-policy.md 。  
- 同步 API 链路重试必须极其保守；Worker 采用带抖动的指数退避。  
- 若上游返回 retryAfterMs ，必须优先遵循。  

## 第三条：技术栈（一期冻结）

- 全栈语言：TypeScript  
- 后端：NestJS  
- ORM：Prisma（后续落地）  
- DB：PostgreSQL  
- Queue：BullMQ + Redis  
- 前端：React + Vite + Tailwind CSS  
- 动效：Framer Motion  
- 图表：Recharts  
- 移动端：Capacitor  
- UI 库的选择必须符合性能与无障碍标准，且不得引入闭源核心依赖。

## 第四条：Monorepo 结构（冻结）

- apps/web  
- apps/api  
- apps/worker  
- services/ai-gateway  
- packages/schemas  
- packages/shared  
- infra/compose  
- docs  
- env  

Workspace 扫描范围（硬性）：仅 `apps/*` 、 `services/*` 、 `packages/*` 。  

## 第五条：健康检查（Readiness）规范（硬性）

### 5.1 可执行服务（API / Worker / AI Gateway）

- 必须提供 GET /health ，输出结构必须对齐 HealthResponseSchema （定义于 packages/schemas ）。  
- 必须采用 @nestjs/terminus 汇总健康指标。  
- 依赖项最低要求：  
  * apps/api：至少检查 Postgres + Redis  
  * apps/worker：至少检查 Redis  
  * services/ai-gateway：至少检查关键配置（云端 key / 本地 endpoint）  

### 5.2 静态站点（Web / SPA）特例条款（新增）

- Web（Vite dev server 或 Nginx/静态服务器部署）不强制提供 HealthResponseSchema 形式的 JSON。  
- Web 必须提供一个健康检查路径，满足：  
  * 返回 **HTTP 200** * 内容可为静态文本（如 ok ）或直接返回 index.html  
- 推荐路径： /healthz （避免与后端 /health 的语义混淆）。如使用 / 作为健康检查也可接受，但语义弱于 /healthz 。  
- Compose / 负载均衡健康检查对 Web 的判据：仅以 **HTTP 200** 为准。  

### 5.3 Compose 编排要求

- 在拓扑联通阶段， depends_on 必须使用 condition: service_healthy （禁止仅用启动顺序替代就绪状态）。  
- 每个容器必须定义 healthcheck 与合理的重试策略。  
- 容器编排必须使用 condition: service_healthy，且服务必须提供对齐 Schema 的 /health 接口。

## 第六条：工具链依赖一致性（硬性）

- TypeScript / ESLint / Prettier 版本必须全仓一致。  
- 通过根 pnpm.overrides 强制锁版本。  
- 根目录必须安装实际工具链依赖，确保 pnpm -w eslint/prettier/tsc 可执行。  

## 第七条：TypeScript 基础配置统一（硬性）

- 根目录必须存在 tsconfig.base.json ，为唯一来源。  
- workspace 内 tsconfig 必须通过 extends 继承，仅覆盖路径/输出类选项。  
- 不得关闭：  
  * strict  
  * noImplicitAny  
  * noUncheckedIndexedAccess  
  * forceConsistentCasingInFileNames  

## 第八条：隐私与安全原则

1. **数据主权**：所有家庭数据默认本地存储，健康记录等敏感信息必须加密（数据库层面或应用层面）。
2. **最小权限**：认证系统（未来实现）必须支持多成员角色（管理员、编辑者、查看者）。
3. **零泄露承诺**：Git 仓库永不提交敏感信息（环境变量、API Key、真实数据）。仅提交 `.env.example`。
4. **审计要求**：重大安全相关变更必须记录 ADR，并进行代码审查。

## 第九条：贡献与决策规则

1. **贡献者**：家庭成员享有最高贡献权限，外部贡献者（如未来开源）需通过 Pull Request 审查。
2. **决策流程**：
   - 小变更（bug 修复、文档）：直接提交。
   - 中变更（新功能、模块调整）：需在 docs/adr 中记录理由。
   - 大变更（技术栈更换、目录结构调整）：必须符合宪法，且发起宪法修订程序。
3. **版本管理**：遵循语义化版本（SemVer）：
   - v0.x：开发阶段。
   - v1.x：稳定云端 AI 版本。
   - v2.x：本地 AI 为主版本。

## 第十条：宪法修订程序

1. 宪法修订需满足以下全部条件：
   - 发起人记录详细理由（新 ADR）。
   - 家庭核心成员讨论并达成共识（至少 2/3 同意，若家庭成员 >3 人）。
   - 新版本宪法提交独立 commit，标题为 “Constitution: vX.Y 更新”。
2. 修订频率：建议每年不超过一次，保持宪法稳定性。

## 第十一条：版本记录

- v1.2：固化方案 A、命名一致性、workspace 范围、compose 分层意识  
- v1.3：工具链一致性、tsconfig.base.json、Terminus 健康检查规范、Schema 引用红线  
- v1.4：新增 Web/SPA 健康检查特例条款（HTTP 200 即可，推荐 /healthz）  
- v1.5：AI 错误契约、x-request-id 追踪、重试政策硬性化  
- v1.6：整合家庭核心价值观与宣言式原则，强化严苛性标准；保留并显式强化 v1.5 所有技术硬约束（如全链路追踪、健康检查、AI 错误契约、TypeScript 基准）；调整技术栈定义为标准导向，避免具体库名；解决版本回退问题，确保 ADR 溯源清晰。

## 附则

- 本宪法解释权归项目发起人及家庭核心成员。
- 若项目目标发生根本性变化（例如转为商业项目），宪法自动失效，需重新制定。

**签署**：  
[你的名字或家庭昵称]  
2026 年 1 月 3 日
