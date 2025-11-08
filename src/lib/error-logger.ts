/**
 * Error Logging Service
 * Centralized error logging with console and future integration support
 */

export type ErrorLevel = 'info' | 'warning' | 'error' | 'critical';

export interface ErrorLog {
  timestamp: string;
  level: ErrorLevel;
  message: string;
  context?: string;
  error?: any;
  userId?: string;
  metadata?: Record<string, any>;
}

class ErrorLogger {
  private logs: ErrorLog[] = [];
  private maxLogs = 100; // Keep last 100 logs in memory

  /**
   * Log an error with context
   */
  log(level: ErrorLevel, message: string, error?: any, context?: string, metadata?: Record<string, any>) {
    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error: error ? this.serializeError(error) : undefined,
      metadata,
    };

    // Add to in-memory logs
    this.logs.push(errorLog);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest log
    }

    // Console logging with colors
    this.consoleLog(errorLog);

    // Store in localStorage for persistence
    this.persistLog(errorLog);

    // Future: Send to external service (Sentry, LogRocket, etc.)
    // this.sendToExternalService(errorLog);
  }

  /**
   * Serialize error object for logging
   */
  private serializeError(error: any): any {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    return error;
  }

  /**
   * Console logging with appropriate styling
   */
  private consoleLog(log: ErrorLog) {
    const emoji = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      critical: '🚨',
    };

    const color = {
      info: 'color: #3b82f6',
      warning: 'color: #f59e0b',
      error: 'color: #ef4444',
      critical: 'color: #dc2626; font-weight: bold',
    };

    console.log(
      `%c${emoji[log.level]} [${log.level.toUpperCase()}] ${log.timestamp}`,
      color[log.level]
    );
    console.log(`Message: ${log.message}`);
    if (log.context) console.log(`Context: ${log.context}`);
    if (log.metadata) console.log('Metadata:', log.metadata);
    if (log.error) console.error('Error:', log.error);
    console.log('---');
  }

  /**
   * Persist logs to localStorage (client-side only)
   */
  private persistLog(log: ErrorLog) {
    // Only persist on client-side
    if (typeof window === 'undefined') return;
    
    try {
      const key = 'app_error_logs';
      const stored = localStorage.getItem(key);
      const logs: ErrorLog[] = stored ? JSON.parse(stored) : [];
      
      logs.push(log);
      
      // Keep only last 50 logs in localStorage
      if (logs.length > 50) {
        logs.shift();
      }
      
      localStorage.setItem(key, JSON.stringify(logs));
    } catch (e) {
      // Silently fail if localStorage is not available
      console.warn('Failed to persist error log:', e);
    }
  }

  /**
   * Get all logs
   */
  getLogs(): ErrorLog[] {
    return [...this.logs];
  }

  /**
   * Get logs from localStorage (client-side only)
   */
  getPersistedLogs(): ErrorLog[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem('app_error_logs');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
    
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem('app_error_logs');
    } catch (e) {
      console.warn('Failed to clear persisted logs:', e);
    }
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    const allLogs = [...this.getPersistedLogs(), ...this.logs];
    return JSON.stringify(allLogs, null, 2);
  }

  /**
   * Convenience methods
   */
  info(message: string, context?: string, metadata?: Record<string, any>) {
    this.log('info', message, undefined, context, metadata);
  }

  warning(message: string, error?: any, context?: string, metadata?: Record<string, any>) {
    this.log('warning', message, error, context, metadata);
  }

  error(message: string, error?: any, context?: string, metadata?: Record<string, any>) {
    this.log('error', message, error, context, metadata);
  }

  critical(message: string, error?: any, context?: string, metadata?: Record<string, any>) {
    this.log('critical', message, error, context, metadata);
  }
}

// Singleton instance
export const errorLogger = new ErrorLogger();

// Global error handler
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    errorLogger.error(
      'Uncaught error',
      event.error,
      'Global Error Handler',
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }
    );
  });

  window.addEventListener('unhandledrejection', (event) => {
    errorLogger.error(
      'Unhandled promise rejection',
      event.reason,
      'Global Promise Handler'
    );
  });
}
