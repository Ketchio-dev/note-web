/**
 * Performance Metrics Tracking
 * Monitors core web vitals for the editor
 */

interface Metric {
    name: string;
    value: number;
    timestamp: number;
}

class PerformanceMetrics {
    private metrics: Metric[] = [];
    private observers: Map<string, PerformanceObserver> = new Map();

    constructor() {
        if (typeof window !== 'undefined') {
            this.setupObservers();
        }
    }

    private setupObservers() {
        // Long Task Observer (input blocking)
        if ('PerformanceObserver' in window) {
            const longTaskObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.duration > 50) {
                        console.warn('Long task detected:', entry.duration, 'ms');
                        this.record('long-task', entry.duration);
                    }
                }
            });

            try {
                longTaskObserver.observe({ entryTypes: ['longtask'] });
                this.observers.set('longtask', longTaskObserver);
            } catch (e) {
                // longtask not supported in all browsers
            }
        }
    }

    /**
     * Record a custom metric
     */
    record(name: string, value: number) {
        const metric: Metric = {
            name,
            value,
            timestamp: Date.now(),
        };

        this.metrics.push(metric);

        // Keep only last 100 metrics
        if (this.metrics.length > 100) {
            this.metrics.shift();
        }

        // Log if exceeds threshold
        this.checkThreshold(metric);
    }

    /**
     * Measure time between two marks
     */
    measure(name: string, startMark: string, endMark: string) {
        if (typeof performance === 'undefined') return;

        try {
            performance.measure(name, startMark, endMark);
            const measure = performance.getEntriesByName(name)[0];
            this.record(name, measure.duration);

            // Clean up marks
            performance.clearMarks(startMark);
            performance.clearMarks(endMark);
            performance.clearMeasures(name);
        } catch (e) {
            // Marks don't exist
        }
    }

    /**
     * Mark a point in time
     */
    mark(name: string) {
        if (typeof performance !== 'undefined') {
            performance.mark(name);
        }
    }

    /**
     * Get average for a metric
     */
    getAverage(name: string, count: number = 10): number {
        const relevantMetrics = this.metrics
            .filter(m => m.name === name)
            .slice(-count);

        if (relevantMetrics.length === 0) return 0;

        const sum = relevantMetrics.reduce((acc, m) => acc + m.value, 0);
        return sum / relevantMetrics.length;
    }

    /**
     * Get all metrics for debugging
     */
    getMetrics() {
        return [...this.metrics];
    }

    /**
     * Check if metric exceeds threshold and warn
     */
    private checkThreshold(metric: Metric) {
        const thresholds: Record<string, number> = {
            'keystroke-latency': 50,
            'save-latency': 1000,
            'render-time': 16, // 60fps = 16ms per frame
            'block-creation': 100,
        };

        const threshold = thresholds[metric.name];
        if (threshold && metric.value > threshold) {
            console.warn(
                `⚠️ ${metric.name} exceeded threshold:`,
                `${metric.value.toFixed(2)}ms (threshold: ${threshold}ms)`
            );
        }
    }

    /**
     * Clean up observers
     */
    cleanup() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
    }
}

// Singleton instance
export const metrics = new PerformanceMetrics();

/**
 * Hook for tracking editor input latency
 */
export function trackInputLatency() {
    if (typeof window === 'undefined') return;

    let keydownTime = 0;

    window.addEventListener('keydown', () => {
        keydownTime = performance.now();
        metrics.mark('keydown-start');
    });

    // Use requestAnimationFrame to measure when DOM is actually updated
    window.addEventListener('keyup', () => {
        requestAnimationFrame(() => {
            const latency = performance.now() - keydownTime;
            metrics.record('keystroke-latency', latency);
        });
    });
}

/**
 * Track save operations
 */
export function trackSaveOperation(callback: () => Promise<void>) {
    return async () => {
        const startTime = performance.now();
        metrics.mark('save-start');

        try {
            await callback();
            const duration = performance.now() - startTime;
            metrics.record('save-latency', duration);
            metrics.mark('save-end');
            metrics.measure('save-duration', 'save-start', 'save-end');
        } catch (error) {
            console.error('Save failed:', error);
            throw error;
        }
    };
}

/**
 * Development mode metrics display
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    (window as any).__metrics__ = metrics;

    // Log average metrics every 10 seconds
    setInterval(() => {
        console.log('📊 Performance Metrics:', {
            keystrokeLatency: metrics.getAverage('keystroke-latency').toFixed(2) + 'ms',
            saveLatency: metrics.getAverage('save-latency').toFixed(2) + 'ms',
            longTasks: metrics.getMetrics().filter(m => m.name === 'long-task').length,
        });
    }, 10000);
}
