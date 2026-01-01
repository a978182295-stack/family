// packages/schemas/AIErrorCode.ts
export enum AIErrorCode {
  RATE_LIMITED = "RATE_LIMITED",
  INVALID_UPSTREAM_RESPONSE = "INVALID_UPSTREAM_RESPONSE",
  TIMEOUT = "TIMEOUT",
  INVALID_REQUEST = "INVALID_REQUEST",
  // 新增其他可能的错误代码
}

// packages/schemas/AIErrorResponse.ts
export interface AIErrorResponse {
  code: AIErrorCode;
  message: string;
  retryAfterMs?: number;  // 只有 RATE_LIMITED 会有这个字段
}