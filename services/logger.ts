import { db } from "./firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

/**
 * Log data can be any serializable object
 */
type LogData =
  | Record<string, unknown>
  | string
  | number
  | boolean
  | null
  | undefined;

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: LogData;
  timestamp: Timestamp;
  userId?: string;
  organizationId?: string;
  url: string;
}

class Logger {
  private isProduction: boolean;

  constructor() {
    // Safely check if we're in production, default to false if env is not available
    try {
      this.isProduction = Boolean(import.meta.env?.PROD);
    } catch (e) {
      // Fallback if import.meta.env is not available
      this.isProduction = false;
    }
  }

  private async log(level: LogLevel, message: string, data?: LogData) {
    try {
      const timestamp = Timestamp.now();
      const url =
        typeof window !== "undefined" ? window.location.href : "unknown";

      // Console logging - pass objects directly so browser console can format them nicely
      const consoleMethod =
        level === LogLevel.ERROR
          ? "error"
          : level === LogLevel.WARN
          ? "warn"
          : "log";

      if (data !== undefined && data !== null) {
        // Pass object directly to console for nice formatting
        console[consoleMethod](`[${level}] ${message}`, data);
      } else {
        console[consoleMethod](`[${level}] ${message}`);
      }

      // Persistent logging for Errors in production
      if (level === LogLevel.ERROR && this.isProduction) {
        try {
          await addDoc(collection(db, "system_logs"), {
            level,
            message,
            data: data ? JSON.parse(JSON.stringify(data)) : null, // Ensure serializable
            timestamp,
            url,
            userAgent:
              typeof navigator !== "undefined"
                ? navigator.userAgent
                : "unknown",
          });
        } catch (e) {
          // Silently fail - don't break the app if logging fails
          console.error("Failed to send log to Firestore", e);
        }
      }
    } catch (e) {
      // If logging fails completely, fall back to console.error
      // This ensures the app never breaks due to logging issues
      console.error("Logger error:", e);
      console.error(`[${level}] ${message}`, data);
    }
  }

  debug(message: string, data?: LogData) {
    try {
      if (!this.isProduction) {
        // Don't await - fire and forget to avoid blocking
        this.log(LogLevel.DEBUG, message, data).catch(() => {
          // Silently fail - logging should never break the app
        });
      }
    } catch (e) {
      // Fallback to console if logger fails
      console.log(`[DEBUG] ${message}`, data);
    }
  }

  info(message: string, data?: LogData) {
    try {
      // Don't await - fire and forget to avoid blocking
      this.log(LogLevel.INFO, message, data).catch(() => {
        // Silently fail - logging should never break the app
      });
    } catch (e) {
      // Fallback to console if logger fails
      console.log(`[INFO] ${message}`, data);
    }
  }

  warn(message: string, data?: LogData) {
    try {
      // Don't await - fire and forget to avoid blocking
      this.log(LogLevel.WARN, message, data).catch(() => {
        // Silently fail - logging should never break the app
      });
    } catch (e) {
      // Fallback to console if logger fails
      console.warn(`[WARN] ${message}`, data);
    }
  }

  error(message: string, error?: unknown) {
    try {
      const errorData: LogData =
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : typeof error === "object" && error !== null
          ? (error as Record<string, unknown>)
          : { error: String(error) };

      // Don't await - fire and forget to avoid blocking
      this.log(LogLevel.ERROR, message, errorData).catch(() => {
        // Silently fail - logging should never break the app
      });
    } catch (e) {
      // Fallback to console if logger fails
      console.error(`[ERROR] ${message}`, error);
    }
  }
}

export const logger = new Logger();
