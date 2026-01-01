import { AIErrorCode, AIErrorResponse } from '@family-hub/schemas';
import { exponentialBackoffRetry } from './retry-strategy'; // 引入重试函数

async function handleErrorCode(errorCode: AIErrorCode, response: any) {
  switch (errorCode) {
    case AIErrorCode.RATE_LIMITED:
      const retryAfterMs = response.headers.get("retryAfterMs");
      if (retryAfterMs) {
        console.log(`Rate limited. Retrying after ${retryAfterMs}ms`);
        await delay(retryAfterMs); // 等待 retryAfterMs 的时间
      } else {
        await exponentialBackoffRetry(() => requestFunction(), 1, 5, 1000); // 默认使用指数退避策略
      }
      break;
    case AIErrorCode.INVALID_UPSTREAM_RESPONSE:
    case AIErrorCode.TIMEOUT:
      await exponentialBackoffRetry(() => requestFunction(), 1, 5, 1000);
      break;
    default:
      throw new Error("Unknown error");
  }
}

async function requestFunction() {
  // 示例请求逻辑，实际需要根据你的接口进行调整
  const response = await fetch("/some-api-endpoint");
  if (!response.ok) {
    const errorCode = getErrorCode(response); // 提取错误码
    await handleErrorCode(errorCode, response); // 调用对应的错误处理逻辑
  }
  return response;
}