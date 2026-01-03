# family-hub

家庭使用的 Web/PWA 应用，后期可用 Capacitor 壳化为 App。目标：健康记录、菜谱、旅行攻略、知识库，且 AI 供应商可替换（一期云端，二期本地）。

## 目录结构（冻结）
- apps/web：前端（Vite + React）
- apps/api：API（NestJS）
- apps/worker：Worker（NestJS，BullMQ 消费者）
- services/ai-gateway：AI Gateway（NestJS，统一 AIProvider）
- packages/schemas：Zod 契约（唯一真理）
- packages/shared：纯工具
- infra/compose：Docker Compose
- docs：规范/ADR
- env：环境模板（只提交 *.env.example）

## 规范入口
- docs/constitution.md（项目宪法，法律级别）

## 环境要求
- Node + pnpm
- Docker / Docker Compose
- 运行时约束（当前拓扑联通阶段）：
  - Node 服务（api/worker/ai-gateway）的容器运行时需支持 `node -e fetch(...)` 健康检查（建议 Node 18+ / 推荐 Node 20 LTS）
  - web 当前为 dev 镜像形态时也可能使用 node 兜底健康检查；后续如切换为 Nginx 静态托管，需要同步调整 web 健康检查策略（见下文 Runbook）

## 启动（开发环境）
1) 复制 env 模板为真实 env（不要提交到 git）
- 从 env/dev.env.example 复制为 env/dev.env
- 必须按你的本机/团队约定修改 POSTGRES_PASSWORD 等值

2) 启动 Compose（base + dev 覆盖）
- 建议在仓库根目录执行：

docker compose --env-file env/dev.env \
  -f infra/compose/docker-compose.yml \
  -f infra/compose/docker-compose.dev.yml \
  up -d

（可选）快捷命令：`pnpm compose:up`

3) 停止

docker compose --env-file env/dev.env \
  -f infra/compose/docker-compose.yml \
  -f infra/compose/docker-compose.dev.yml \
  down

（可选）快捷命令：`pnpm compose:down`

## Workspace 范围（冻结）
pnpm workspace 仅扫描：
- apps/*
- services/*
- packages/*
不包含 infra/docs/env

## 健康检查（Readiness）
- 可执行服务（api/worker/ai-gateway）：
  - 必须提供 GET /health
  - 必须提供 GET /healthz（Compose healthcheck 使用，可与 /health 返回一致）
  - 输出结构对齐 packages/schemas 的 HealthResponseSchema
  - 使用 @nestjs/terminus
- Web（SPA/静态站点）：
  - 必须提供一个健康检查路径返回 HTTP 200（推荐 /healthz；当前 dev 可用 / 返回 200）
  - Compose healthcheck 对 web 仅以 HTTP 200 为判据

---

# Runbook / Troubleshooting

## 1) web 容器一直处于 unhealthy（优先排查 default_server / Host）
健康检查在容器内通常使用 127.0.0.1 访问（网络隔离友好）。若未来 web 切换为容器内 Nginx 反代/静态托管，以下问题会导致探测返回 403/404，从而 unhealthy：

### 优先排查项（按顺序）
1) Nginx 是否配置了 default_server  
- 必须存在类似配置：
  - `listen 80 default_server;`
- 否则当 healthcheck 未携带 Host 或 Host 不匹配时，可能无法匹配到正确 server block。

2) 是否存在“依赖 Host 才能访问”的 server_name 策略  
- 若 Nginx 配置严格依赖特定域名（Host 头），healthcheck 请求可能被路由到错误 server，返回 404/403。

3) 是否存在强制跳转（301/302）或鉴权拦截  
- 健康检查应当返回 200，避免跳转到 https 或登录页等。

### 推荐治理策略（生产 Nginx 形态）
- 提供一个不依赖 Host 的健康端点（推荐）：
  - `location /healthz { return 200 "ok"; }`
- 并在 `default_server` 上暴露该路径，确保任何 Host 都能返回 200。

## 2) api/worker 启动后业务连接报错（DATABASE_URL）
- api 的 /health 会检查 Postgres 与 Redis：当 DATABASE_URL 缺失或不可用时应直接 unhealthy。
- 在执行 docker compose up 前，务必确保 env/dev.env 已从 env/dev.env.example 正确复制并替换必要变量。
- 如果你在宿主机直跑 pnpm dev（非容器），DATABASE_URL 里的 host=postgres 会失效，应切换为 localhost（参考 env/dev.env.example 的注释与示例）。

## 3) healthcheck 与运行时版本不匹配（Node fetch）
- api/worker/ai-gateway 的 healthcheck 目前使用 `node -e fetch(...)`。
- 若镜像运行时非 Node 18+（无全局 fetch），healthcheck 会失败。
- 处理策略：
  - 统一基础镜像为 Node 18+（推荐 Node 20 LTS），或
  - 将 healthcheck 改为 curl/wget（需在镜像内提供对应工具）。
