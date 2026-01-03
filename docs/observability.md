# Observability Contract

This document defines the minimum structured logging fields for outbound calls and retries.

## Outbound Request Logs (fetch-wrapper)
- requestId: Correlates with x-request-id.
- service: Logger base field, set at bootstrap.
- targetService: Logical service name (e.g. ai-gateway).
- operation: Call site name (e.g. ai-gateway.healthz).
- method: HTTP method.
- urlHost: Host only, no query.
- urlPath: Path only, no query.
- attempt: Current attempt number (1-based).
- maxAttempts: Max attempts for this call.
- timeoutMs: Timeout budget for the attempt.
- latencyMs: Duration for the attempt.
- status: HTTP status when present.
- aiErrorCode: AI error code when parsed.
- retry: Whether a retry will happen.
- delayMs: Planned delay before next attempt (when retrying).

## Restrictions
- Do not log request/response bodies.
- Do not log query strings.
- Do not log raw error details payloads; use summaries only.
