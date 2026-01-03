import pino from 'pino';
import { getRequestContext } from './request-context';

let rootLogger: pino.Logger | null = null;

function buildLogger(serviceName: string): pino.Logger {
  return pino({
    base: { service: serviceName },
    messageKey: 'message',
    mixin() {
      const ctx = getRequestContext();
      return ctx ? { requestId: ctx.requestId } : {};
    },
  });
}

export function initLogger(serviceName: string): pino.Logger {
  rootLogger = buildLogger(serviceName);
  return rootLogger;
}

export function getLogger(): pino.Logger {
  if (!rootLogger) {
    rootLogger = buildLogger(process.env.SERVICE_NAME ?? 'unknown');
  }

  return rootLogger;
}

export class PinoNestLogger {
  constructor(private readonly logger: pino.Logger) {}

  log(message: unknown, context?: string): void {
    this.write('info', message, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.write('error', message, context, trace);
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write('trace', message, context);
  }

  private write(
    level: 'info' | 'warn' | 'error' | 'debug' | 'trace',
    message: unknown,
    context?: string,
    trace?: string,
  ): void {
    const payload: Record<string, unknown> = {};
    if (context) payload.context = context;
    if (trace) payload.trace = trace;

    if (typeof message === 'string') {
      this.logger[level](payload, message);
      return;
    }

    this.logger[level]({ ...payload, message });
  }
}
