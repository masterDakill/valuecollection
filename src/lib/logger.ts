// 📊 Structured JSON Logger
// Compatible with Cloudflare Workers and log aggregation systems

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  userId?: string;
  apiSource?: string;
  itemId?: number;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

export class Logger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  /**
   * Create child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }

  /**
   * Log structured message
   */
  private log(level: LogLevel, message: string, meta?: LogContext | Error): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context }
    };

    // Handle Error objects
    if (meta instanceof Error) {
      entry.error = {
        message: meta.message,
        stack: meta.stack,
        code: (meta as any).code
      };
    } else if (meta) {
      entry.context = { ...entry.context, ...meta };
    }

    // Output as JSON
    const logLine = JSON.stringify(entry);

    // Use appropriate console method
    switch (level) {
      case 'debug':
        console.debug(logLine);
        break;
      case 'info':
        console.log(logLine);
        break;
      case 'warn':
        console.warn(logLine);
        break;
      case 'error':
        console.error(logLine);
        break;
    }
  }

  debug(message: string, meta?: LogContext): void {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: LogContext): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: LogContext | Error): void {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: LogContext | Error): void {
    this.log('error', message, meta);
  }

  /**
   * Log API request start
   */
  logRequestStart(method: string, path: string, meta?: LogContext): void {
    this.info(`${method} ${path} - Request started`, meta);
  }

  /**
   * Log API request completion
   */
  logRequestEnd(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
    meta?: LogContext
  ): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    this.log(
      level,
      `${method} ${path} - ${statusCode} (${durationMs}ms)`,
      { statusCode, durationMs, ...meta }
    );
  }

  /**
   * Log cache operation
   */
  logCacheOperation(operation: 'hit' | 'miss' | 'set' | 'invalidate', apiSource: string, meta?: LogContext): void {
    this.info(`Cache ${operation}: ${apiSource}`, { operation, apiSource, ...meta });
  }

  /**
   * Log expert analysis
   */
  logExpertAnalysis(
    expert: string,
    success: boolean,
    latencyMs: number,
    confidence?: number,
    meta?: LogContext
  ): void {
    this.info(`Expert ${expert} analysis ${success ? 'completed' : 'failed'}`, {
      expert,
      success,
      latencyMs,
      confidence,
      ...meta
    });
  }

  /**
   * Log validation error
   */
  logValidationError(field: string, error: string, meta?: LogContext): void {
    this.warn(`Validation failed: ${field} - ${error}`, { field, validationError: error, ...meta });
  }
}

/**
 * Create logger instance with request context
 */
export function createLogger(requestId?: string, additionalContext?: LogContext): Logger {
  return new Logger({ requestId, ...additionalContext });
}

/**
 * Global logger for non-request contexts
 */
export const logger = new Logger();
