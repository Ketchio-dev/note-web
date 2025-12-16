/**
 * Adaptive debounce hook
 * Adjusts debounce timing based on collaboration and user activity
 */

import { useCallback, useRef, useEffect } from 'react';

interface AdaptiveDebounceOptions {
    baseDelay: number;
    collaborativeDelay?: number;
    idleDelay?: number;
    hasCollaborators?: boolean;
}

/**
 * Hook that provides adaptive debouncing based on activity and collaboration
 */
export function useAdaptiveDebounce<T extends (...args: any[]) => any>(
    callback: T,
    options: AdaptiveDebounceOptions
): T {
    const {
        baseDelay,
        collaborativeDelay = Math.floor(baseDelay * 0.6), // 40% faster when collaborating
        idleDelay = Math.floor(baseDelay * 2), // 2x slower when idle
        hasCollaborators = false,
    } = options;

    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const lastActivityRef = useRef<number>(Date.now());

    const debouncedFunction = useCallback(
        (...args: Parameters<T>) => {
            const now = Date.now();
            const timeSinceLastActivity = now - lastActivityRef.current;
            lastActivityRef.current = now;

            // Determine appropriate delay
            let delay = baseDelay;

            if (hasCollaborators) {
                // Fast sync when others are editing
                delay = collaborativeDelay;
            } else if (timeSinceLastActivity < 1000) {
                // User is actively typing
                delay = baseDelay;
            } else if (timeSinceLastActivity > 5000) {
                // User has been idle - slower sync to reduce server load
                delay = idleDelay;
            }

            // Clear existing timeout
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            // Set new timeout
            timeoutRef.current = setTimeout(() => {
                callback(...args);
            }, delay);
        },
        [callback, baseDelay, collaborativeDelay, idleDelay, hasCollaborators]
    );

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return debouncedFunction as T;
}

/**
 * Immediate flush for adaptive debounce
 */
export function useAdaptiveDebounceWithFlush<T extends (...args: any[]) => any>(
    callback: T,
    options: AdaptiveDebounceOptions
): [T, () => void] {
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const lastActivityRef = useRef<number>(Date.now());
    const pendingArgsRef = useRef<Parameters<T> | undefined>(undefined);

    const {
        baseDelay,
        collaborativeDelay = Math.floor(baseDelay * 0.6),
        idleDelay = Math.floor(baseDelay * 2),
        hasCollaborators = false,
    } = options;

    const flush = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = undefined;
        }
        if (pendingArgsRef.current) {
            callback(...pendingArgsRef.current);
            pendingArgsRef.current = undefined;
        }
    }, [callback]);

    const debouncedFunction = useCallback(
        (...args: Parameters<T>) => {
            const now = Date.now();
            const timeSinceLastActivity = now - lastActivityRef.current;
            lastActivityRef.current = now;

            pendingArgsRef.current = args;

            let delay = baseDelay;
            if (hasCollaborators) {
                delay = collaborativeDelay;
            } else if (timeSinceLastActivity < 1000) {
                delay = baseDelay;
            } else if (timeSinceLastActivity > 5000) {
                delay = idleDelay;
            }

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                callback(...args);
                pendingArgsRef.current = undefined;
            }, delay);
        },
        [callback, baseDelay, collaborativeDelay, idleDelay, hasCollaborators]
    );

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return [debouncedFunction as T, flush];
}
