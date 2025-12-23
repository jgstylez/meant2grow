
import { db } from './firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
}

/**
 * Log data can be any serializable object
 */
type LogData = Record<string, unknown> | string | number | boolean | null | undefined;

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
    private isProduction = import.meta.env.PROD;

    private async log(level: LogLevel, message: string, data?: LogData) {
        const timestamp = Timestamp.now();
        const url = window.location.href;

        // Console logging
        const consoleMethod = level === LogLevel.ERROR ? 'error' : level === LogLevel.WARN ? 'warn' : 'log';
        console[consoleMethod](`[${level}] ${message}`, data || '');

        // Persistent logging for Errors in production
        if (level === LogLevel.ERROR && this.isProduction) {
            try {
                await addDoc(collection(db, 'system_logs'), {
                    level,
                    message,
                    data: data ? JSON.parse(JSON.stringify(data)) : null, // Ensure serializable
                    timestamp,
                    url,
                    userAgent: navigator.userAgent
                });
            } catch (e) {
                console.error('Failed to send log to Firestore', e);
            }
        }
    }

    debug(message: string, data?: LogData) {
        if (!this.isProduction) this.log(LogLevel.DEBUG, message, data);
    }

    info(message: string, data?: LogData) {
        this.log(LogLevel.INFO, message, data);
    }

    warn(message: string, data?: LogData) {
        this.log(LogLevel.WARN, message, data);
    }

    error(message: string, error?: unknown) {
        const errorData: LogData = error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
                name: error.name,
            }
            : typeof error === 'object' && error !== null
                ? (error as Record<string, unknown>)
                : { error: String(error) };

        this.log(LogLevel.ERROR, message, errorData);
    }
}

export const logger = new Logger();
