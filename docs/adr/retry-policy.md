# ADR: Retry Policy for AI Errors (v1.0)

## Status
Accepted

## Context
本项目采用 AI Gateway 统一封装云端/本地模型能力，并通过 `AIErrorResponseSchema`（`packages/schemas`）向 `apps/api` 与 `apps/worker` 传递统一错误语义。

为了避免：
- 盲目重试导致的限流雪崩（429 放大）
- 瞬时错误立即重试带来的并发尖峰
- 结构化输出失败（格式漂移/截断/上下文问题）重复立即重试造成成功率下降

需要定义“错误码 → 重试策略”的硬性规则，并在 `apps/worker`（BullMQ）与 `apps/api`（同步调用）中一致执行。

## Decision
对 `AIErrorCode` 的重试策略定义如下。

### 1) RATE_LIMITED
- **retryable**：true
- **策略**：
  - 若响应包含 `retryAfterMs`：必须优先尊重该值（等待该时长后再重试）。
  - 若缺失 `retryAfterMs`：使用指数退避（Exponential Backoff），并添加抖动（jitter）。
- **原因**：429 通常是上游明确的节流信号，优先遵循上游窗口能显著提升成功率并降低整体成本。

### 2) INVALID_UPSTREAM_RESPONSE
- **retryable**：true
- **策略**：指数退避（Exponential Backoff）+ 抖动（jitter），不得立即连续重试。
- **原因**：
  - 结构化 JSON 不符合 Schema 的失败通常是概率性失败，受上下文长度、并发负载、截断等因素影响。
  - 稍作等待后重试的成功率往往高于立即重试。

### 3) TIMEOUT
- **retryable**：true
- **策略**：指数退避（Exponential Backoff）+ 抖动（jitter）。
- **原因**：网络抖动/瞬时拥塞常见，指数退避可避免拥塞扩散。

### 4) UPSTREAM_UNAVAILABLE / UPSTREAM_ERROR
- **retryable**：true
- **策略**：指数退避（Exponential Backoff）+ 抖动（jitter）。
- **原因**：上游 5xx/服务不可用通常短期波动，退避能减少雪崩与成本浪费。

### 5) CONFIG_MISSING
- **retryable**：false
- **策略**：不重试；直接失败并记录告警/日志。
- **原因**：配置缺失属于确定性失败，重试无意义。

### 6) INVALID_REQUEST
- **retryable**：false
- **策略**：不重试；直接失败并反馈请求不合法。
- **原因**：请求参数/Schema 不合法属于确定性失败，重试无意义。

### 7) INTERNAL_ERROR / UNKNOWN
- **retryable**：默认 false（保守）
- **策略**：
  - `apps/api`：不做同步重试（避免放大未知故障）。
  - `apps/worker`：可在受控范围内做 1 次指数退避重试（可选），并强制记录错误上下文。
- **原因**：未知错误可能来自代码缺陷或不可恢复状态，盲目重试会放大风险。

## Implementation Guidelines

### A) Worker（BullMQ）默认建议（可作为后续实现的基线）
- `attempts`: 3（高成本任务可降为 2）
- `backoff`: exponential
- `baseDelayMs`: 1000
- `jitter`: ±20%
- `RATE_LIMITED` 且存在 `retryAfterMs`：以 `retryAfterMs` 为下一次延迟的下限（max(baseDelay, retryAfterMs)）

> 说明：指数序列示例（不含抖动）：1s → 2s → 4s

### B) API（同步请求）建议
- 同步重试应极其保守：
  - `RATE_LIMITED`：不做同步重试（直接失败或转异步），避免阻塞与放大限流。
  - `INVALID_UPSTREAM_RESPONSE / TIMEOUT / UPSTREAM_*`：最多 1 次退避重试（300–800ms 区间），再失败则转异步任务（交给 worker）。
- 目的：保护用户体验与系统稳定性，避免同步链路长时间等待。

### C) Observability（必须）
- 每次重试必须记录：
  - `x-request-id`
  - `AIErrorCode`
  - `attempt` / `maxAttempts`
  - `delayMs`（含 retryAfterMs 或退避计算结果）
- 日志不得记录敏感信息（API Key、完整上游响应原文等）。

## Consequences
- 系统在面对限流/上游波动/格式漂移时更稳定，且成本可控。
- 需要在 Step 3 实现 BullMQ 与 API 调用层时严格遵循该策略，避免策略漂移。