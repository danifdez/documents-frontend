function property(value: unknown, key: string): unknown {
    if ((typeof value === 'object' && value !== null) || typeof value === 'function') {
        return (value as Record<string, unknown>)[key];
    }
    return undefined;
}

export function getErrorMessage(error: unknown): string | undefined {
    const message = property(error, 'message');
    return typeof message === 'string' ? message : undefined;
}

export function getResponseError(error: unknown, key = 'message'): string | undefined {
    const payload = property(property(error, 'response'), 'data');
    const message = property(payload, key);
    if (Array.isArray(message) && message.every(item => typeof item === 'string')) {
        return message.join(',');
    }
    return typeof message === 'string' ? message : undefined;
}

export function getResponseStatus(error: unknown): number | undefined {
    const status = property(property(error, 'response'), 'status');
    return typeof status === 'number' ? status : undefined;
}
