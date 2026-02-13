function isTimestampLike(value: unknown): value is { toDate: () => Date } {
    return (
        typeof value === 'object'
        && value !== null
        && 'toDate' in value
        && typeof (value as { toDate?: unknown }).toDate === 'function'
    );
}

export function toPlainJson<T>(value: T): T {
    if (value === null || value === undefined) {
        return value;
    }

    if (isTimestampLike(value)) {
        return value.toDate().toISOString() as T;
    }

    if (value instanceof Date) {
        return value.toISOString() as T;
    }

    if (Array.isArray(value)) {
        return value.map((item) => toPlainJson(item)) as T;
    }

    if (typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>).map(([key, val]) => [key, toPlainJson(val)]);
        return Object.fromEntries(entries) as T;
    }

    return value;
}
