/**
 * Performance Optimization Utilities
 * Code splitting, lazy loading, and memoization helpers
 */

import { lazy, ComponentType } from 'react';

/**
 * Lazy load components with retry logic
 */
export function lazyWithRetry<T extends ComponentType<any>>(
    componentImport: () => Promise<{ default: T }>,
    retries = 3
): ReturnType<typeof lazy> {
    return lazy(async () => {
        for (let i = 0; i < retries; i++) {
            try {
                return await componentImport();
            } catch (error) {
                if (i === retries - 1) throw error;
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
            }
        }
        throw new Error('Failed to load component');
    });
}

/**
 * Preload a lazy component
 */
export function preloadComponent(componentImport: () => Promise<any>) {
    return componentImport();
}

/**
 * Debounce with leading edge option
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    options: { leading?: boolean; trailing?: boolean } = {}
): T & { cancel: () => void; flush: () => void } {
    let timeout: NodeJS.Timeout | null = null;
    let lastArgs: any[] | null = null;
    let lastThis: any = null;

    const { leading = false, trailing = true } = options;

    function debounced(this: any, ...args: any[]) {
        lastArgs = args;
        lastThis = this;

        if (timeout) {
            clearTimeout(timeout);
        } else if (leading) {
            func.apply(this, args);
        }

        timeout = setTimeout(() => {
            if (trailing && lastArgs) {
                func.apply(lastThis, lastArgs);
            }
            timeout = null;
            lastArgs = null;
            lastThis = null;
        }, wait);
    }

    debounced.cancel = () => {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
            lastArgs = null;
            lastThis = null;
        }
    };

    debounced.flush = () => {
        if (lastArgs) {
            func.apply(lastThis, lastArgs);
            debounced.cancel();
        }
    };

    return debounced as any;
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): T & { cancel: () => void } {
    let timeout: NodeJS.Timeout | null = null;
    let lastRan: number | null = null;

    function throttled(this: any, ...args: any[]) {
        const now = Date.now();

        if (!lastRan) {
            func.apply(this, args);
            lastRan = now;
        } else {
            if (timeout) clearTimeout(timeout);

            timeout = setTimeout(() => {
                if (now - lastRan! >= wait) {
                    func.apply(this, args);
                    lastRan = now;
                }
            }, wait - (now - lastRan));
        }
    }

    throttled.cancel = () => {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
        lastRan = null;
    };

    return throttled as any;
}

/**
 * Memoize expensive calculations
 */
export function memoize<T extends (...args: any[]) => any>(
    func: T,
    resolver?: (...args: Parameters<T>) => string
): T & { cache: Map<string, ReturnType<T>> } {
    const cache = new Map<string, ReturnType<T>>();

    function memoized(this: any, ...args: Parameters<T>): ReturnType<T> {
        const key = resolver ? resolver(...args) : JSON.stringify(args);

        if (cache.has(key)) {
            return cache.get(key)!;
        }

        const result = func.apply(this, args);
        cache.set(key, result);

        // Limit cache size to prevent memory leaks
        if (cache.size > 100) {
            const firstKey = cache.keys().next().value;
            if (firstKey !== undefined) {
                cache.delete(firstKey);
            }
        }

        return result;
    }

    memoized.cache = cache;
    return memoized as any;
}

/**
 * Intersection Observer hook for lazy loading
 */
export function createIntersectionObserver(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit
): IntersectionObserver {
    return new IntersectionObserver(callback, {
        rootMargin: '50px',
        threshold: 0.01,
        ...options,
    });
}

/**
 * Request idle callback wrapper with fallback
 */
export function requestIdleCallback(
    callback: IdleRequestCallback,
    options?: IdleRequestOptions
): number {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        return window.requestIdleCallback(callback, options);
    }
    // Fallback to setTimeout
    return setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 50 }), 1) as any;
}

export function cancelIdleCallback(id: number) {
    if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(id);
    } else {
        clearTimeout(id);
    }
}

/**
 * Batch updates to reduce re-renders
 */
export function batchUpdates<T>(updates: Array<() => T>): T[] {
    return updates.map(update => update());
}

/**
 * Web Worker wrapper for heavy computations
 */
export function createWorker(workerFunction: Function): Worker {
    const blob = new Blob([`(${workerFunction.toString()})()`], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    return new Worker(url);
}

/**
 * Image lazy loading helper
 */
export function lazyLoadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

/**
 * Service Worker registration
 */
export async function registerServiceWorker(scriptURL: string): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register(scriptURL);
        console.log('Service Worker registered:', registration);
        return registration;
    } catch (error) {
        console.error('Service Worker registration failed:', error);
        return null;
    }
}
