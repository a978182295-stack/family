import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

type RequestWithId = Request & { requestId?: string };

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const headerRid = req.header('x-request-id');
    const requestId =
      typeof headerRid === 'string' && headerRid.trim().length > 0 ? headerRid.trim() : randomUUID();

    // 挂载到 req，供全链路日志/异常处理使用
    (req as RequestWithId).requestId = requestId;

    // 所有响应都回传 request id（包括正常响应）
    res.setHeader('x-request-id', requestId);

    next();
  }
}
