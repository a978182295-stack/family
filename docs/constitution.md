# Project Constitution (family-hub) v1.5

## 0. 基本信息（冻结）
- Project Slug：`family-hub`
- Root Package Name：`@family-hub/root`
- 关键架构选择（冻结）：
  - AI Gateway：独立服务 `services/ai-gateway`（方案 A）
  - Worker：独立应用 `apps/worker`（方案 A）

---

## 1. 硬性技术标准（The Manifesto）

### 1.1 架构解耦准则（法律级）
1) 业务逻辑与 AI 供应商隔离  
- 业务代码禁止直接调用任何模型 SDK/客户端（云端或本地）。  
- 必须通过 `AIProvider` 统一接口，经由 `services/ai-gateway` 提供能力。

2) 前后端分离  
- 后端仅提供 JSON API。  
- 前端只通过 API 取数/写入，不共享后端内部逻辑。

3) 模块边界清晰  
- 每个业务域独立模块：健康/菜谱/旅行/笔记等。  
- 禁止把所有接口堆在单一文件中。

### 1.2 数据交换准则（Schema First）
1) 结构化输出  
- AI 输出必须为结构化 JSON，并通过 Schema 校验（Zod / Pydantic）。  
- 不合格则后端拦截并重试/降级，禁止脏数据传给前端或直接入库。

2) 数据库唯一真理  
- PostgreSQL 是唯一权威状态。  
- Redis/本地缓存只用于加速与体验，不可成为主状态。

3) 契约引用红线（禁止手写 DTO 漂移）  
- 所有 API 入参/出参类型必须从 `packages/schemas` 的 Zod Schema 推导（例如 `z.infer<typeof Schema>`）。  
- 禁止在 `apps/api` 内另写“权威 DTO”。如需 DTO，只能做薄封装并复用 Schema。

4) AI 错误契约（硬性）  
- 所有 AI 相关错误必须输出 `AIErrorResponseSchema` 形态。  
- 错误码必须来自 `AIErrorCode`（`packages/schemas`），禁止手写字符串漂移。  
- 任何异常必须在进入 API/Worker 之前被 AI Gateway 规整为结构化错误。

### 1.3 部署与环境准则
1) 一切皆 Docker  
- 本地开发环境必须与 NAS 运行环境高度一致（Compose 分层）。

2) 配置外部化  
- 密钥、密码、路径等必须通过 env 注入。  
- 必须提供 `.env.example`，真实 `.env` 禁止入库。

### 1.4 扩展性预留
- 模块化目录：功能必须独立模块文件夹。  
- AI 可替换：一期云端，二期本地，仅允许在 ai-gateway 内切换 provider。

### 1.5 推进规则（硬性）
- 你不说“下一步”，不执行下一步。  
- 一步一产物、变更先改宪法再动工。

### 1.6 全链路追踪（硬性）
- 所有可执行服务（API / Worker / AI Gateway）必须在 Middleware 层提取或生成 `x-request-id`。  
- 必须在响应头中回传 `x-request-id`，并透传到下游请求。  
- 日志必须记录该 ID，作为跨服务排障的最小索引。

### 1.7 重试政策（硬性）
- AI 相关重试策略必须遵循 `docs/adr/retry-policy.md`。  
- 同步 API 链路重试必须极其保守；Worker 采用带抖动的指数退避。  
- 若上游返回 `retryAfterMs`，必须优先遵循。

---

## 2. 技术栈（一期冻结）
- 全栈语言：TypeScript
- 后端：NestJS
- ORM：Prisma（后续落地）
- DB：PostgreSQL
- Queue：BullMQ + Redis
- 前端：React + Vite + Tailwind CSS
- 动效：Framer Motion
- 图表：Recharts
- 移动端：Capacitor

---

## 3. Monorepo 结构（冻结）
- apps/web
- apps/api
- apps/worker
- services/ai-gateway
- packages/schemas
- packages/shared
- infra/compose
- docs
- env

Workspace 扫描范围（硬性）：仅 `apps/*`、`services/*`、`packages/*`。

---

## 4. 健康检查（Readiness）规范（硬性）

### 4.1 可执行服务（API / Worker / AI Gateway）
- 必须提供 `GET /health`，输出结构必须对齐 `HealthResponseSchema`（定义于 `packages/schemas`）。
- 必须采用 `@nestjs/terminus` 汇总健康指标。
- 依赖项最低要求：
  - apps/api：至少检查 Postgres + Redis
  - apps/worker：至少检查 Redis
  - services/ai-gateway：至少检查关键配置（云端 key / 本地 endpoint）

### 4.2 静态站点（Web / SPA）特例条款（新增）
- Web（Vite dev server 或 Nginx/静态服务器部署）不强制提供 `HealthResponseSchema` 形式的 JSON。
- Web 必须提供一个健康检查路径，满足：
  - 返回 **HTTP 200**
  - 内容可为静态文本（如 `ok`）或直接返回 `index.html`
- 推荐路径：`/healthz`（避免与后端 `/health` 的语义混淆）。如使用 `/` 作为健康检查也可接受，但语义弱于 `/healthz`。
- Compose / 负载均衡健康检查对 Web 的判据：仅以 **HTTP 200** 为准。

### 4.3 Compose 编排要求
- 在拓扑联通阶段，`depends_on` 必须使用 `condition: service_healthy`（禁止仅用启动顺序替代就绪状态）。
- 每个容器必须定义 `healthcheck` 与合理的重试策略。

---

## 5. 工具链依赖一致性（硬性）
- TypeScript / ESLint / Prettier 版本必须全仓一致。  
- 通过根 `pnpm.overrides` 强制锁版本。  
- 根目录必须安装实际工具链依赖，确保 `pnpm -w eslint/prettier/tsc` 可执行。

---

## 6. TypeScript 基础配置统一（硬性）
- 根目录必须存在 `tsconfig.base.json`，为唯一来源。  
- workspace 内 tsconfig 必须通过 extends 继承，仅覆盖路径/输出类选项。  
- 不得关闭：
  - strict
  - noImplicitAny
  - noUncheckedIndexedAccess
  - forceConsistentCasingInFileNames

---

## 10. 版本记录
- v1.2：固化方案 A、命名一致性、workspace 范围、compose 分层意识
- v1.3：工具链一致性、tsconfig.base.json、Terminus 健康检查规范、Schema 引用红线
- v1.4：新增 Web/SPA 健康检查特例条款（HTTP 200 即可，推荐 /healthz）
- v1.5：AI 错误契约、x-request-id 追踪、重试政策硬性化
