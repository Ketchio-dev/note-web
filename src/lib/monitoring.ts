/**
 * Error Tracking & Analytics
 * Production error logging and user analytics
 */

// Error tracking configuration
interface ErrorLog {
    message: string;
    stack?: string;
    componentStack?: string;
    timestamp: Date;
    userId?: string;
    url: string;
    userAgent: string;
    severity: 'error' | 'warning' | 'info';
}

// Analytics event
interface AnalyticsEvent {
    name: string;
    properties?: Record<string, any>;
    timestamp: Date;
    userId?: string;
}

class ProductionMonitor {
    private errorQueue: ErrorLog[] = [];
    private analyticsQueue: AnalyticsEvent[] = [];
    private isProduction = process.env.NODE_ENV === 'production';

    /**
     * Initialize monitoring
     */
    init() {
        if (typeof window === 'undefined') return;

        // Global error handler
        window.addEventListener('error', (event) => {
            this.logError({
                message: event.message,
                stack: event.error?.stack,
                severity: 'error',
            });
        });

        // Unhandled promise rejection
        window.addEventListener('unhandledrejection', (event) => {
            this.logError({
                message: `Unhandled Promise Rejection: ${event.reason}`,
                severity: 'error',
            });
        });

        // Performance monitoring
        if ('performance' in window && 'PerformanceObserver' in window) {
            this.initPerformanceMonitoring();
        }

        // Flush queues periodically
        setInterval(() => this.flush(), 30000); // Every 30s

        console.log('🔍 Production monitoring initialized');
    }

    /**
     * Log error
     */
    logError(error: Partial<ErrorLog>) {
        const errorLog: ErrorLog = {
            message: error.message || 'Unknown error',
            stack: error.stack,
            componentStack: error.componentStack,
            timestamp: new Date(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            severity: error.severity || 'error',
        };

        this.errorQueue.push(errorLog);
        console.error('Error logged:', errorLog);

        // Send immediately for critical errors
        if (errorLog.severity === 'error') {
            this.flush();
        }
    }

    /**
     * Track analytics event
     */
    track(eventName: string, properties?: Record<string, any>) {
        const event: AnalyticsEvent = {
            name: eventName,
            properties: {
                ...properties,
                timestamp: Date.now(),
            },
            timestamp: new Date(),
        };

        this.analyticsQueue.push(event);

        // Log in development
        if (!this.isProduction) {
            console.log('📊 Analytics:', eventName, properties);
        }
    }

    /**
     * Track page view
     */
    pageView(path: string) {
        this.track('page_view', { path });
    }

    /**
     * Track user action
     */
    action(action: string, details?: Record<string, any>) {
        this.track('user_action', { action, ...details });
    }

    /**
     * Initialize performance monitoring
     */
    private initPerformanceMonitoring() {
        // Long tasks
        try {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    if (entry.duration > 50) {
                        // Tasks > 50ms
                        this.track('long_task', {
                            duration: entry.duration,
                            startTime: entry.startTime,
                        });
                    }
                });
            });
            observer.observe({ entryTypes: ['longtask'] });
        } catch (e) {
            // Long task API not supported
        }

        // Core Web Vitals
        if ('web-vital' in window) {
            // Would use web-vitals library in production
            this.track('core_web_vitals_ready');
        }
    }

    /**
     * Flush queues to server
     */
    private async flush() {
        if (this.errorQueue.length === 0 && this.analyticsQueue.length === 0) {
            return;
        }

        const errors = [...this.errorQueue];
        const analytics = [...this.analyticsQueue];

        this.errorQueue = [];
        this.analyticsQueue = [];

        if (!this.isProduction) {
            console.log('Would send to server:', { errors, analytics });
            return;
        }

        try {
            // Send to error tracking service (e.g., Sentry)
            if (errors.length > 0) {
                await fetch('/api/errors', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ errors }),
                });
            }

            // Send to analytics service (e.g., PostHog, Plausible)
            if (analytics.length > 0) {
                await fetch('/api/analytics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ events: analytics }),
                });
            }
        } catch (error) {
            console.error('Failed to flush monitoring data:', error);
            // Re-queue on failure
            this.errorQueue.unshift(...errors);
            this.analyticsQueue.unshift(...analytics);
        }
    }

    /**
     * Identify user (for analytics)
     */
    identify(userId: string, traits?: Record<string, any>) {
        this.track('identify', { userId, ...traits });
    }

    /**
     * Set user ID for error tracking
     */
    setUser(userId: string) {
        this.errorQueue.forEach((error) => {
            error.userId = userId;
        });
    }
}

// Singleton instance
export const monitor = new ProductionMonitor();

// Auto-initialize in browser
if (typeof window !== 'undefined') {
    monitor.init();
}

// Convenient exports
export const logError = (error: Partial<ErrorLog>) => monitor.logError(error);
export const trackEvent = (name: string, properties?: Record<string, any>) =>
    monitor.track(name, properties);
export const trackPageView = (path: string) => monitor.pageView(path);
export const trackAction = (action: string, details?: Record<string, any>) =>
    monitor.action(action, details);
export const identifyUser = (userId: string, traits?: Record<string, any>) =>
    monitor.identify(userId, traits);
