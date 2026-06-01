/**
 * Yapısal loglama utility'si
 * Tüm loglar JSON formatında — production'da log aggregator'a yönlendirilebilir
 */

type LogLevel = "debug" | "info" | "warn" | "error"

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: string
  data?: Record<string, unknown>
  error?: string
}

function formatLog(level: LogLevel, message: string, context?: string, data?: Record<string, unknown>, error?: Error): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context && { context }),
    ...(data && { data }),
    ...(error && { error: error.message }),
  }
}

export const logger = {
  debug(message: string, context?: string, data?: Record<string, unknown>) {
    if (process.env.NODE_ENV === "development") {
      console.debug(JSON.stringify(formatLog("debug", message, context, data)))
    }
  },

  info(message: string, context?: string, data?: Record<string, unknown>) {
    console.log(JSON.stringify(formatLog("info", message, context, data)))
  },

  warn(message: string, context?: string, data?: Record<string, unknown>) {
    console.warn(JSON.stringify(formatLog("warn", message, context, data)))
  },

  error(message: string, error?: Error, context?: string, data?: Record<string, unknown>) {
    console.error(JSON.stringify(formatLog("error", message, context, data, error)))
  },
}
