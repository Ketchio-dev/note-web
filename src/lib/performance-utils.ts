/**
 * Performance Utilities
 * Code splitting, lazy loading, and optimization helpers
 */

import { lazy, ComponentType } from 'react';

/**
 * Lazy load component with retry logic
 */
export function lazyWithRetry<T extends ComponentType<any>>(
    componentImport: () => Promise<{ default: T }>,
    componentName: string
): React.LazyExoticComponent<T> {
    return lazy(async () => {
        const pageHasAlreadyBeenForceRefreshed = JSON.parse(
            window.sessionStorage.getItem(`retry-${componentName}`) || 'false'
        );

        try {
            const component = await componentImport();
            window.sessionStorage.setItem(`retry-${componentName}`, 'false');
            return component;
        } catch (error) {
            if (!pageHasAlreadyBeenForceRefreshed) {
                window.sessionStorage.setItem(`retry-${componentName}`, 'true');
                return window.location.reload() as any;
            }
            throw error;
        }
    });
}

/**
 * Debounce function for performance
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            timeout = null;
            func(...args);
        };

        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function for scroll/resize events
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean;

    return function executedFunction(...args: Parameters<T>) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

/**
 * Intersection Observer for lazy loading
 */
export function useIntersectionObserver(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit
) {
    if (typeof IntersectionObserver === 'undefined') {
        return null;
    }

    return new IntersectionObserver(callback, {
        root: null,
        rootMargin: '50px',
        threshold: 0.1,
        ...options,
    });
}

/**
 * Performance monitoring
 */
export class PerformanceMonitor {
    private marks: Map<string, number> = new Map();

    mark(name: string) {
        this.marks.set(name, performance.now());
    }

    measure(name: string, startMark: string): number {
        const start = this.marks.get(startMark);
        if (!start) {
            console.warn(`No mark found for ${startMark}`);
            return 0;
        }

        const duration = performance.now() - start;
        console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
        return duration;
    }

    clear() {
        this.marks.clear();
    }
}

/**
 * Image optimization helper
 */
export function optimizeImage(src: string, width?: number, quality?: number): string {
    if (!src) return '';

    // If using Next.js Image Optimization API
    const params = new URLSearchParams();
    if (width) params.set('w', width.toString());
    if (quality) params.set('q', quality.toString());

    return `/_next/image?url=${encodeURIComponent(src)}&${params.toString()}`;
}

/**
 * Bundle size analyzer
 */
export function logBundleSize(componentName: string) {
    if (process.env.NODE_ENV === 'development') {
        console.log(`[Bundle] Loaded: ${componentName}`);
    }
}

/**
 * Memory leak detector
 */
export function detectMemoryLeaks() {
    if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') {
        return;
    }

    let lastMemory = 0;

    setInterval(() => {
        if ('memory' in performance) {
            const memory = (performance as any).memory;
            const currentMemory = memory.usedJSHeapSize / 1048576; // Convert to MB

            if (currentMemory > lastMemory * 1.5) {
                console.warn(
                    `[Memory] Possible memory leak detected: ${currentMemory.toFixed(2)}MB (was ${lastMemory.toFixed(2)}MB)`
                );
            }

            lastMemory = currentMemory;
        }
    }, 10000); // Check every 10 seconds
}

/**
 * Code splitting manifest
 */
export const LAZY_COMPONENTS = {
    // High priority (preload)
    UnifiedEditor: () => import('@/components/UnifiedEditor'),
    DatabaseView: () => import('@/components/DatabaseView'),

    // Medium priority (load on demand)
    AIAssistant: () => import('@/components/AIAssistant'),
    SettingsModal: () => import('@/components/SettingsModal'),
    SharePopover: () => import('@/components/SharePopover'),

    // Low priority (lazy load)
    CommentsSidebar: () => import('@/components/CommentsSidebar'),
    CollaborationDrawer: () => import('@/components/CollaborationDrawer'),
    MigrationPanel: () => import('@/components/MigrationPanel'),
} as const;

/**
 * Prefetch helper
 */
export function prefetchComponent(componentName: keyof typeof LAZY_COMPONENTS) {
    if (typeof window === 'undefined') return;

    // Use requestIdleCallback for low-priority prefetching
    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
            LAZY_COMPONENTS[componentName]();
        });
    } else {
        setTimeout(() => {
            LAZY_COMPONENTS[componentName]();
        }, 1);
    }
}

/**
 * Virtual scrolling helper
 */
export function calculateVisibleRange(
    scrollTop: number,
    containerHeight: number,
    itemHeight: number,
    totalItems: number,
    overscan: number = 3
): { start: number; end: number } {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(totalItems, start + visibleCount + overscan * 2);

    return { start, end };
}
