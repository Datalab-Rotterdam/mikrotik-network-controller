import { fail, redirect, type ActionFailure, type RequestEvent } from '@sveltejs/kit';

type MessageType = 'success' | 'error' | 'warning' | 'info';

/**
 * Parse a string value from FormData with trimming.
 */
export function formString(formData: FormData, name: string, defaultValue = ''): string {
    return String(formData.get(name) ?? defaultValue).trim();
}

/**
 * Parse a required string value from FormData — returns empty string if missing.
 */
export function formString$(formData: FormData, name: string): string {
    return formString(formData, name);
}

/**
 * Parse a number value from FormData.
 */
export function formNumber(formData: FormData, name: string, defaultValue = 0): number {
    const raw = formData.get(name);
    if (raw === null || raw === undefined || raw === '') return defaultValue;
    const n = Number(raw);
    return Number.isFinite(n) ? n : defaultValue;
}

/**
 * Standardized fail response helper.
 */
export function failResponse(status: number, data: Record<string, unknown>): ActionFailure<Record<string, unknown>> {
    return fail(status, data);
}

/**
 * Redirect with a flash message stored in a cookie.
 */
export function redirectWithMessage(
    event: Pick<RequestEvent, 'cookies'>,
    path: string,
    message: string,
    type: MessageType = 'success',
    status: 303 | 302 = 303
): never {
    event.cookies.set('flash_message', encodeURIComponent(message), {
        path: '/',
        maxAge: 5,
        httpOnly: true,
        sameSite: 'lax',
    });
    event.cookies.set('flash_type', type, {
        path: '/',
        maxAge: 5,
        httpOnly: true,
        sameSite: 'lax',
    });
    throw redirect(status, path);
}

/**
 * Clear flash message cookies and return the message.
 */
export function consumeFlash(
    cookies: Pick<RequestEvent['cookies'], 'get' | 'delete'>
): { message: string; type: MessageType } | null {
    const rawMessage = cookies.get('flash_message');
    const rawType = cookies.get('flash_type');

    if (rawMessage && rawType) {
        cookies.delete('flash_message', { path: '/' });
        cookies.delete('flash_type', { path: '/' });
        const type = ['success', 'error', 'warning', 'info'].includes(rawType)
            ? rawType as MessageType
            : 'info';
        return { message: decodeURIComponent(rawMessage), type };
    }

    cookies.delete('flash_message', { path: '/' });
    cookies.delete('flash_type', { path: '/' });
    return null;
}

/**
 * Validate that a string is not empty.
 */
export function requireString(value: string, fieldName: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
        throw new Error(`${fieldName} is required.`);
    }
    return trimmed;
}

/**
 * Validate enum-like value.
 */
export function requireOneOf<T extends string>(
    value: string,
    allowed: readonly T[],
    fieldName: string
): T {
    if (!allowed.includes(value as T)) {
        throw new Error(`${fieldName} must be one of: ${allowed.join(', ')}.`);
    }
    return value as T;
}

/**
 * Validate a TCP port number.
 */
export function requirePort(value: number): number {
    if (!Number.isInteger(value) || value < 1 || value > 65535) {
        throw new Error('Must be a valid TCP port (1-65535).');
    }
    return value;
}

/**
 * Validate a TCP port number.
 */
export function validateTcpPort(port: number): void {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('API port must be a valid TCP port');
    }
}

/**
 * Wrap an async action handler with standardized error handling.
 */
export async function withActionError<T extends Record<string, unknown>>(
    fn: () => Promise<T | ActionFailure<T>>
): Promise<T | ActionFailure<T>> {
    try {
        return await fn();
    } catch (error) {
        if (error instanceof Error && 'headers' in error) {
            throw error;
        }
        const errorData: Record<string, unknown> = {
            message: error instanceof Error ? error.message : 'An unexpected error occurred.',
        };
        return fail(500, errorData as unknown as T);
    }
}
