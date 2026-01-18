import log from 'electron-log'
import path from 'path'

// Configure log levels
// In production: error, warn, info
// In development: error, warn, info, debug
const isDevelopment = process.env.NODE_ENV === 'development'

log.transports.file.level = isDevelopment ? 'debug' : 'info'
log.transports.console.level = isDevelopment ? 'debug' : 'info'

// Configure file transport
log.transports.file.maxSize = 5 * 1024 * 1024 // 5MB
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}'

// Log file location (can be found in app.getPath('userData')/logs/)
log.info('Log file location:', log.transports.file.getFile().path)

// Add custom format for console
log.transports.console.format = '[{h}:{i}:{s}] [{level}] {text}'

// Export configured logger
export default log

// Convenience methods
export const logger = {
  error: (message: string, ...args: any[]) => log.error(message, ...args),
  warn: (message: string, ...args: any[]) => log.warn(message, ...args),
  info: (message: string, ...args: any[]) => log.info(message, ...args),
  debug: (message: string, ...args: any[]) => log.debug(message, ...args),
  
  // Specialized loggers
  db: {
    info: (message: string, ...args: any[]) => log.info('[DB]', message, ...args),
    error: (message: string, ...args: any[]) => log.error('[DB]', message, ...args),
    debug: (message: string, ...args: any[]) => log.debug('[DB]', message, ...args),
  },
  
  api: {
    info: (message: string, ...args: any[]) => log.info('[API]', message, ...args),
    error: (message: string, ...args: any[]) => log.error('[API]', message, ...args),
    debug: (message: string, ...args: any[]) => log.debug('[API]', message, ...args),
  },
  
  ui: {
    info: (message: string, ...args: any[]) => log.info('[UI]', message, ...args),
    error: (message: string, ...args: any[]) => log.error('[UI]', message, ...args),
    debug: (message: string, ...args: any[]) => log.debug('[UI]', message, ...args),
  }
}
