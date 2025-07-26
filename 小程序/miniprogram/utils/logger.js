// utils/logger.js - 日志工具（简化版本）
class Logger {
  constructor() {
    this.logLevel = 'info'
  }

  debug(message, data = null) {
    console.log(`[DEBUG] ${message}`, data)
  }

  info(message, data = null) {
    console.log(`[INFO] ${message}`, data)
  }

  warn(message, data = null) {
    console.warn(`[WARN] ${message}`, data)
  }

  error(message, data = null) {
    console.error(`[ERROR] ${message}`, data)
  }
}

const logger = new Logger()
export default logger