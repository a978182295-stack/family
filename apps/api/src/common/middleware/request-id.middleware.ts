import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { extractRequestId, runWithRequestContext } from '@family-hub/observability';

type RequestWithId = Request & { requestId?: string };

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const headerRid = req.header('x-request-id');
    const { requestId, requestIdSource } = extractRequestId(headerRid);

    (req as RequestWithId).requestId = requestId;
    res.setHeader('x-request-id', requestId);

    runWithRequestContext({ requestId, requestIdSource }, () => next());
  }
}
