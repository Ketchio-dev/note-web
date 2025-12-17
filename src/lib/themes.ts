/**
 * Theme System
 * Supports multiple themes with customization
 */

export interface Theme {
    id: string;
    name: string;
    description: string;
    colors: {
        // Background
        background: string;
        foreground: string;

        // Primary
        primary: string;
        primaryForeground: string;

        // Secondary
        secondary: string;
        secondaryForeground: string;

        // Accent
        accent: string;
        accentForeground: string;

        // Muted
        muted: string;
        mutedForeground: string;

        // Border
        border: string;

        // Card
        card: string;
        cardForeground: string;

        // Destructive
        destructive: string;
        destructiveForeground: string;
    };
    fonts: {
        sans: string;
        serif: string;
        mono: string;
    };
}

export const BUILTIN_THEMES: Theme[] = [
    {
        id: 'light',
        name: 'Light',
        description: 'Clean and bright',
        colors: {
            background: '#ffffff',
            foreground: '#0a0a0a',
            primary: '#2563eb',
            primaryForeground: '#ffffff',
            secondary: '#f1f5f9',
            secondaryForeground: '#0a0a0a',
            accent: '#f1f5f9',
            accentForeground: '#0a0a0a',
            muted: '#f1f5f9',
            mutedForeground: '#64748b',
            border: '#e2e8f0',
            card: '#ffffff',
            cardForeground: '#0a0a0a',
            destructive: '#ef4444',
            destructiveForeground: '#ffffff',
        },
        fonts: {
            sans: 'Inter, system-ui, sans-serif',
            serif: 'Georgia, serif',
            mono: 'JetBrains Mono, monospace',
        },
    },
    {
        id: 'dark',
        name: 'Dark',
        description: 'Easy on the eyes',
        colors: {
            background: '#0a0a0a',
            foreground: '#fafafa',
            primary: '#3b82f6',
            primaryForeground: '#ffffff',
            secondary: '#1f2937',
            secondaryForeground: '#fafafa',
            accent: '#1f2937',
            accentForeground: '#fafafa',
            muted: '#1f2937',
            mutedForeground: '#94a3b8',
            border: '#27272a',
            card: '#0a0a0a',
            cardForeground: '#fafafa',
            destructive: '#ef4444',
            destructiveForeground: '#ffffff',
        },
        fonts: {
            sans: 'Inter, system-ui, sans-serif',
            serif: 'Georgia, serif',
            mono: 'JetBrains Mono, monospace',
        },
    },
    {
        id: 'solarized',
        name: 'Solarized Dark',
        description: 'Classic developer theme',
        colors: {
            background: '#002b36',
            foreground: '#839496',
            primary: '#268bd2',
            primaryForeground: '#fdf6e3',
            secondary: '#073642',
            secondaryForeground: '#93a1a1',
            accent: '#073642',
            accentForeground: '#93a1a1',
            muted: '#073642',
            mutedForeground: '#586e75',
            border: '#073642',
            card: '#002b36',
            cardForeground: '#839496',
            destructive: '#dc322f',
            destructiveForeground: '#fdf6e3',
        },
        fonts: {
            sans: 'Inter, system-ui, sans-serif',
            serif: 'Georgia, serif',
            mono: 'JetBrains Mono, monospace',
        },
    },
    {
        id: 'dracula',
        name: 'Dracula',
        description: 'Dark with vibrant colors',
        colors: {
            background: '#282a36',
            foreground: '#f8f8f2',
            primary: '#bd93f9',
            primaryForeground: '#282a36',
            secondary: '#44475a',
            secondaryForeground: '#f8f8f2',
            accent: '#44475a',
            accentForeground: '#f8f8f2',
            muted: '#44475a',
            mutedForeground: '#6272a4',
            border: '#44475a',
            card: '#282a36',
            cardForeground: '#f8f8f2',
            destructive: '#ff5555',
            destructiveForeground: '#f8f8f2',
        },
        fonts: {
            sans: 'Inter, system-ui, sans-serif',
            serif: 'Georgia, serif',
            mono: 'JetBrains Mono, monospace',
        },
    },
    {
        id: 'nord',
        name: 'Nord',
        description: 'Arctic, north-bluish color palette',
        colors: {
            background: '#2e3440',
            foreground: '#eceff4',
            primary: '#88c0d0',
            primaryForeground: '#2e3440',
            secondary: '#3b4252',
            secondaryForeground: '#eceff4',
            accent: '#3b4252',
            accentForeground: '#eceff4',
            muted: '#3b4252',
            mutedForeground: '#d8dee9',
            border: '#434c5e',
            card: '#2e3440',
            cardForeground: '#eceff4',
            destructive: '#bf616a',
            destructiveForeground: '#eceff4',
        },
        fonts: {
            sans: 'Inter, system-ui, sans-serif',
            serif: 'Georgia, serif',
            mono: 'JetBrains Mono, monospace',
        },
    },
    {
        id: 'catppuccin',
        name: 'Catppuccin Mocha',
        description: 'Soothing pastel theme',
        colors: {
            background: '#1e1e2e',
            foreground: '#cdd6f4',
            primary: '#89b4fa',
            primaryForeground: '#1e1e2e',
            secondary: '#313244',
            secondaryForeground: '#cdd6f4',
            accent: '#313244',
            accentForeground: '#cdd6f4',
            muted: '#313244',
            mutedForeground: '#a6adc8',
            border: '#45475a',
            card: '#1e1e2e',
            cardForeground: '#cdd6f4',
            destructive: '#f38ba8',
            destructiveForeground: '#1e1e2e',
        },
        fonts: {
            sans: 'Inter, system-ui, sans-serif',
            serif: 'Georgia, serif',
            mono: 'JetBrains Mono, monospace',
        },
    },
];

/**
 * Apply theme to document
 */
export function applyTheme(theme: Theme) {
    const root = document.documentElement;

    // Apply colors as CSS variables
    Object.entries(theme.colors).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value);
    });

    // Apply fonts
    root.style.setProperty('--font-sans', theme.fonts.sans);
    root.style.setProperty('--font-serif', theme.fonts.serif);
    root.style.setProperty('--font-mono', theme.fonts.mono);

    // Save to localStorage
    localStorage.setItem('current-theme', theme.id);
}

/**
 * Get current theme from localStorage
 */
export function getCurrentTheme(): Theme {
    if (typeof window === 'undefined') return BUILTIN_THEMES[0];

    const savedThemeId = localStorage.getItem('current-theme');
    return BUILTIN_THEMES.find(t => t.id === savedThemeId) || BUILTIN_THEMES[0];
}

/**
 * Hook for using themes
 */
import { useState, useEffect } from 'react';

export function useTheme() {
    const [currentTheme, setCurrentTheme] = useState<Theme>(BUILTIN_THEMES[0]);

    useEffect(() => {
        const theme = getCurrentTheme();
        setCurrentTheme(theme);
        applyTheme(theme);
    }, []);

    const changeTheme = (themeId: string) => {
        const theme = BUILTIN_THEMES.find(t => t.id === themeId);
        if (theme) {
            setCurrentTheme(theme);
            applyTheme(theme);
        }
    };

    return {
        currentTheme,
        changeTheme,
        themes: BUILTIN_THEMES,
    };
}
