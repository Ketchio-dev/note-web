/**
 * Mobile Navigation Hook
 * Provides mobile-optimized navigation with touch gestures
 */

import { useEffect, useState, useCallback } from 'react';

interface TouchState {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isDragging: boolean;
}

export function useTouchGestures() {
    const [touchState, setTouchState] = useState<TouchState>({
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        isDragging: false,
    });

    const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        const touch = e.touches[0];
        setTouchState({
            startX: touch.clientX,
            startY: touch.clientY,
            currentX: touch.clientX,
            currentY: touch.clientY,
            isDragging: true,
        });
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        if (!touchState.isDragging) return;

        const touch = e.touches[0];
        setTouchState(prev => ({
            ...prev,
            currentX: touch.clientX,
            currentY: touch.clientY,
        }));
    }, [touchState.isDragging]);

    const handleTouchEnd = useCallback(() => {
        setTouchState(prev => ({
            ...prev,
            isDragging: false,
        }));
    }, []);

    const swipeDirection = useCallback(() => {
        const deltaX = touchState.currentX - touchState.startX;
        const deltaY = touchState.currentY - touchState.startY;

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            return deltaX > 50 ? 'right' : deltaX < -50 ? 'left' : null;
        } else {
            return deltaY > 50 ? 'down' : deltaY < -50 ? 'up' : null;
        }
    }, [touchState]);

    return {
        touchState,
        swipeDirection,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
    };
}

/**
 * Mobile Sidebar Component
 */

"use client";

import { X, Menu, Home, FileText, Calendar, Database, Settings } from 'lucide-react';
import Link from 'next/link';

interface MobileSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
}

export function MobileSidebar({ isOpen, onClose, workspaceId }: MobileSidebarProps) {
    const { handleTouchStart, handleTouchMove, handleTouchEnd, swipeDirection } = useTouchGestures();

    useEffect(() => {
        const direction = swipeDirection();
        if (direction === 'left' && isOpen) {
            onClose();
        }
    }, [swipeDirection, isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                onClick={onClose}
            />

            {/* Sidebar */}
            <div
                className="fixed left-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-900 z-50 md:hidden transform transition-transform duration-300 ease-out"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="font-semibold text-lg">Menu</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-2">
                    <Link
                        href={`/workspace/${workspaceId}/home`}
                        onClick={onClose}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    >
                        <Home size={20} />
                        <span>Home</span>
                    </Link>

                    <Link
                        href={`/workspace/${workspaceId}`}
                        onClick={onClose}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    >
                        <FileText size={20} />
                        <span>Pages</span>
                    </Link>

                    <Link
                        href={`/workspace/${workspaceId}/calendar`}
                        onClick={onClose}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    >
                        <Calendar size={20} />
                        <span>Calendar</span>
                    </Link>

                    <Link
                        href={`/workspace/${workspaceId}/ai`}
                        onClick={onClose}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    >
                        <Database size={20} />
                        <span>Databases</span>
                    </Link>
                </nav>

                {/* Settings at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-800">
                    <button
                        onClick={onClose}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    >
                        <Settings size={20} />
                        <span>Settings</span>
                    </button>
                </div>
            </div>
        </>
    );
}

/**
 * Mobile Editor Component
 */

interface MobileEditorProps {
    children: React.ReactNode;
}

export function MobileEditor({ children }: MobileEditorProps) {
    return (
        <div className="md:hidden">
            {/* Mobile-optimized editor wrapper */}
            <div className="min-h-screen pb-20">
                {children}
            </div>

            {/* Mobile toolbar - sticky at bottom */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-2 flex items-center justify-around z-30">
                <button className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                    <strong className="text-lg">B</strong>
                </button>
                <button className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                    <em className="text-lg">I</em>
                </button>
                <button className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                    <span className="text-lg">H1</span>
                </button>
                <button className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                    <span className="text-lg">•</span>
                </button>
            </div>
        </div>
    );
}
