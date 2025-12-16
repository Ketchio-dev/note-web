/**
 * Block-level Error Boundary
 * Prevents entire page crash when a single block fails
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
    children: ReactNode;
    blockId?: string;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class BlockErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Block Error Boundary caught error:', {
            blockId: this.props.blockId,
            error,
            componentStack: errorInfo.componentStack,
        });

        // TODO: Send to error tracking service (Sentry, etc.)
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 rounded-lg">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                        <div className="flex-1">
                            <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                                Something went wrong
                            </h4>
                            <p className="text-xs text-red-600 dark:text-red-400 mb-2">
                                {this.state.error?.message || 'An unexpected error occurred'}
                            </p>
                            {this.props.blockId && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                    Block ID: {this.props.blockId.slice(0, 8)}...
                                </p>
                            )}
                            <button
                                onClick={() => this.setState({ hasError: false, error: null })}
                                className="mt-2 text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Page-level Error Boundary with more detailed fallback
 */
export class PageErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Page Error Boundary caught error:', {
            error,
            componentStack: errorInfo.componentStack,
        });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-[#191919] p-4">
                    <div className="max-w-md w-full bg-white dark:bg-[#252525] rounded-lg shadow-lg p-6">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
                                <AlertTriangle className="text-red-500" size={24} />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                    Application Error
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    The page encountered an unexpected error and cannot be displayed.
                                </p>
                            </div>
                        </div>

                        {this.state.error && (
                            <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-gray-700 dark:text-gray-300 break-all">
                                {this.state.error.message}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition text-sm font-medium"
                            >
                                Reload Page
                            </button>
                            <button
                                onClick={() => this.setState({ hasError: false, error: null })}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded transition text-sm font-medium"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
