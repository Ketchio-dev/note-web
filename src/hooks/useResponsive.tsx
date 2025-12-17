/**
 * Responsive Design Utilities
 * Breakpoints and responsive helpers
 */

"use client";

import { useState, useEffect } from 'react';

export const BREAKPOINTS = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
} as const;

/**
 * Hook to detect current breakpoint
 */
export function useBreakpoint() {
    const [breakpoint, setBreakpoint] = useState<keyof typeof BREAKPOINTS>('lg');

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;

            if (width < BREAKPOINTS.sm) setBreakpoint('sm');
            else if (width < BREAKPOINTS.md) setBreakpoint('md');
            else if (width < BREAKPOINTS.lg) setBreakpoint('lg');
            else if (width < BREAKPOINTS.xl) setBreakpoint('xl');
            else setBreakpoint('2xl');
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return breakpoint;
}

/**
 * Hook to detect if mobile
 */
export function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < BREAKPOINTS.md);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return isMobile;
}

/**
 * Hook for media query
 */
export function useMediaQuery(query: string) {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const media = window.matchMedia(query);
        setMatches(media.matches);

        const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
        media.addEventListener('change', listener);
        return () => media.removeEventListener('change', listener);
    }, [query]);

    return matches;
}

/**
 * Responsive Container Component
 */

interface ResponsiveContainerProps {
    children: React.ReactNode;
    className?: string;
}

export function ResponsiveContainer({ children, className = '' }: ResponsiveContainerProps) {
    return (
        <div className={`w-full mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
            {children}
        </div>
    );
}

/**
 * Responsive Grid Component
 */

interface ResponsiveGridProps {
    children: React.ReactNode;
    cols?: { sm?: number; md?: number; lg?: number; xl?: number };
    gap?: number;
    className?: string;
}

export function ResponsiveGrid({
    children,
    cols = { sm: 1, md: 2, lg: 3, xl: 4 },
    gap = 4,
    className = ''
}: ResponsiveGridProps) {
    const gridClass = `
        grid 
        gap-${gap}
        grid-cols-${cols.sm || 1}
        md:grid-cols-${cols.md || 2}
        lg:grid-cols-${cols.lg || 3}
        xl:grid-cols-${cols.xl || 4}
        ${className}
    `.trim().replace(/\s+/g, ' ');

    return <div className={gridClass}>{children}</div>;
}
