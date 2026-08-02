/* eslint-disable no-console */

import type {Logger, LogLevel} from './types'

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  error: 40,
  info: 20,
  silent: 50,
  warn: 30,
}

export interface LoggerOptions {
  cacheVersion: number
  environment: 'development' | 'production'
  logEndpoint?: string
  logLevel: LogLevel
  logSampleRate: number
  notifyClients: (message: Record<string, unknown>) => Promise<void>
}

export const createLogger = (options: LoggerOptions): Logger => {
  const shouldLog = (level: LogLevel) => {
    if (options.logLevel === 'silent') {
      return false
    }

    return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[options.logLevel]
  }

  return (level, message, details) => {
    if (!shouldLog(level) || (options.logSampleRate < 1 && Math.random() > options.logSampleRate)) {
      return
    }

    const payload = {
      cacheVersion: options.cacheVersion,
      details,
      level,
      message,
      timestamp: new Date().toISOString(),
    }

    switch (level) {
      case 'error': {
        console.error(message, details)
        break
      }
      case 'warn': {
        console.warn(message, details)
        break
      }
      case 'info': {
        console.info(message, details)
        break
      }
      default: {
        console.debug(message, details)
      }
    }

    if (options.environment === 'development') {
      options.notifyClients({payload, type: 'SW_LOG'}).catch(() => null)
    }

    if (options.logEndpoint) {
      fetch(options.logEndpoint, {
        body: JSON.stringify(payload),
        headers: {'Content-Type': 'application/json'},
        method: 'POST',
      }).catch(() => null)
    }
  }
}
