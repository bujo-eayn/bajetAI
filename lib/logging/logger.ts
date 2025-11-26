/**
 * Structured Logging Utility
 *
 * Provides standardized logging across all AI services with:
 * - Consistent log format (JSON in production, readable in dev)
 * - Service tagging for filtering
 * - Metadata support
 * - Environment-aware verbosity
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogMetadata = Record<string, any>;

interface LogEntry {
  level: LogLevel;
  service: string;
  message: string;
  timestamp: string;
  metadata?: LogMetadata;
  error?: {
    message: string;
    stack?: string;
    type?: string;
    code?: string;
  };
}

/**
 * Determine if we're in production environment
 */
function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Format log entry for output
 */
function formatLog(entry: LogEntry): string {
  if (isProduction()) {
    // JSON format for production (parseable by log aggregators)
    return JSON.stringify(entry);
  } else {
    // Human-readable format for development
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const service = `[${entry.service}]`.padEnd(20);
    let output = `${timestamp} ${level} ${service} ${entry.message}`;

    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      output += `\n  Metadata: ${JSON.stringify(entry.metadata, null, 2)}`;
    }

    if (entry.error) {
      output += `\n  Error: ${entry.error.message}`;
      if (entry.error.stack) {
        output += `\n  Stack: ${entry.error.stack}`;
      }
    }

    return output;
  }
}

/**
 * Write log entry to console
 */
function writeLog(entry: LogEntry): void {
  const formatted = formatLog(entry);

  switch (entry.level) {
    case 'debug':
      // Only log debug in development
      if (!isProduction()) {
        console.debug(formatted);
      }
      break;

    case 'info':
      console.log(formatted);
      break;

    case 'warn':
      console.warn(formatted);
      break;

    case 'error':
      console.error(formatted);
      break;
  }
}

/**
 * Log debug message (development only)
 *
 * @param service - Service name (e.g., 'OpenAI', 'ProviderChain')
 * @param message - Log message
 * @param metadata - Additional context data
 */
export function debug(
  service: string,
  message: string,
  metadata?: LogMetadata
): void {
  writeLog({
    level: 'debug',
    service,
    message,
    timestamp: new Date().toISOString(),
    metadata,
  });
}

/**
 * Log info message
 *
 * @param service - Service name (e.g., 'OpenAI', 'ProviderChain')
 * @param message - Log message
 * @param metadata - Additional context data
 */
export function info(
  service: string,
  message: string,
  metadata?: LogMetadata
): void {
  writeLog({
    level: 'info',
    service,
    message,
    timestamp: new Date().toISOString(),
    metadata,
  });
}

/**
 * Log warning message
 *
 * @param service - Service name (e.g., 'OpenAI', 'ProviderChain')
 * @param message - Log message
 * @param metadata - Additional context data
 */
export function warn(
  service: string,
  message: string,
  metadata?: LogMetadata
): void {
  writeLog({
    level: 'warn',
    service,
    message,
    timestamp: new Date().toISOString(),
    metadata,
  });
}

/**
 * Log error message
 *
 * @param service - Service name (e.g., 'OpenAI', 'ProviderChain')
 * @param message - Log message
 * @param error - Error object (optional)
 * @param metadata - Additional context data
 */
export function error(
  service: string,
  message: string,
  err?: Error | unknown,
  metadata?: LogMetadata
): void {
  const errorData = err instanceof Error
    ? {
        message: err.message,
        stack: err.stack,
        type: err.constructor.name,
        code: 'code' in err ? String(err.code) : undefined,
      }
    : err
    ? {
        message: String(err),
      }
    : undefined;

  writeLog({
    level: 'error',
    service,
    message,
    timestamp: new Date().toISOString(),
    metadata,
    error: errorData,
  });
}

/**
 * Service tags for consistent naming
 */
export const ServiceTags = {
  OPENAI: 'OpenAI',
  HUGGINGFACE: 'HuggingFace',
  EXTRACTIVE: 'Extractive',
  PROVIDER_CHAIN: 'ProviderChain',
  SUMMARIZATION: 'Summarization',
  RATE_LIMITER: 'RateLimiter',
  PDF_EXTRACTION: 'PDFExtraction',
  INNGEST: 'Inngest',
} as const;

export type ServiceTag = (typeof ServiceTags)[keyof typeof ServiceTags];
