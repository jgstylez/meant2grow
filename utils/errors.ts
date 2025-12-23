/**
 * Type-safe error handling utilities
 * Replaces `any` types in catch blocks with proper error types
 */

/**
 * Standard error type that can be used in catch blocks
 */
export type AppError = Error | { message: string; code?: string;[key: string]: unknown };

/**
 * Type guard to check if error is an Error instance
 */
export function isError(error: unknown): error is Error {
    return error instanceof Error;
}

/**
 * Type guard to check if error has a message property
 */
export function hasMessage(error: unknown): error is { message: string } {
    return (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as { message: unknown }).message === 'string'
    );
}

/**
 * Safely get error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
    if (isError(error)) {
        return error.message;
    }

    if (hasMessage(error)) {
        return error.message;
    }

    if (typeof error === 'string') {
        return error;
    }

    return 'An unknown error occurred';
}

/**
 * Safely get error code from unknown error
 */
export function getErrorCode(error: unknown): string | undefined {
    if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        typeof (error as { code: unknown }).code === 'string'
    ) {
        return (error as { code: string }).code;
    }

    return undefined;
}

/**
 * Format error for logging
 */
export function formatError(error: unknown): {
    message: string;
    code?: string;
    stack?: string;
    details?: Record<string, unknown>;
} {
    const message = getErrorMessage(error);
    const code = getErrorCode(error);

    const formatted: {
        message: string;
        code?: string;
        stack?: string;
        details?: Record<string, unknown>;
    } = { message };

    if (code) {
        formatted.code = code;
    }

    if (isError(error) && error.stack) {
        formatted.stack = error.stack;
    }

    // Include any additional properties
    if (typeof error === 'object' && error !== null) {
        const details: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(error)) {
            if (key !== 'message' && key !== 'code' && key !== 'stack') {
                details[key] = value;
            }
        }
        if (Object.keys(details).length > 0) {
            formatted.details = details;
        }
    }

    return formatted;
}

/**
 * Firebase error type
 */
export interface FirebaseError extends Error {
    code: string;
    customData?: Record<string, unknown>;
}

/**
 * Type guard for Firebase errors
 */
export function isFirebaseError(error: unknown): error is FirebaseError {
    return (
        isError(error) &&
        'code' in error &&
        typeof (error as { code: unknown }).code === 'string' &&
        (error as { code: string }).code.startsWith('auth/') ||
        (error as { code: string }).code.startsWith('firestore/')
    );
}
