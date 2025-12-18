/**
 * Input Validation Utilities
 * Secure input validation for user data
 */

/**
 * Validate URL
 */
export function isValidURL(url: string): boolean {
    if (!url || url.trim().length === 0) return false;

    try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Validate Email
 */
export function isValidEmail(email: string): boolean {
    if (!email || email.trim().length === 0) return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

/**
 * Validate Phone (basic international format)
 */
export function isValidPhone(phone: string): boolean {
    if (!phone || phone.trim().length === 0) return false;

    // Allow digits, spaces, dashes, parentheses, and + for international
    const phoneRegex = /^[\d\s\-()+]+$/;
    const cleaned = phone.trim();

    // Must have at least 7 digits
    const digitCount = (cleaned.match(/\d/g) || []).length;

    return phoneRegex.test(cleaned) && digitCount >= 7 && digitCount <= 15;
}

/**
 * Sanitize string for display (prevent XSS)
 */
export function sanitizeString(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Validate and sanitize URL for safe usage
 */
export function sanitizeURL(url: string): string | null {
    if (!isValidURL(url)) return null;

    try {
        const urlObj = new URL(url);
        // Only allow http and https protocols
        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
            return null;
        }
        return urlObj.href;
    } catch {
        return null;
    }
}

/**
 * Type guards for runtime type checking
 */
export function isString(value: unknown): value is string {
    return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
    return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
    return typeof value === 'boolean';
}

export function isDate(value: unknown): value is Date {
    return value instanceof Date && !isNaN(value.getTime());
}

export function isArray<T>(value: unknown): value is T[] {
    return Array.isArray(value);
}
