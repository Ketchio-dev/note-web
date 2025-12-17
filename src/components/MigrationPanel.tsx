/**
 * Migration Panel Component
 * UI for migrating pages to block system
 */

"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    migratePage,
    migrateWorkspace,
    getWorkspaceMigrationStatus,
} from '@/lib/migration';
import { RefreshCw, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

interface MigrationPanelProps {
    workspaceId: string;
    pageId?: string; // If provided, show single page migration
}

export default function MigrationPanel({ workspaceId, pageId }: MigrationPanelProps) {
    const { user } = useAuth();
    const [status, setStatus] = useState<{
        totalPages: number;
        migratedPages: number;
        pendingPages: number;
        percentComplete: number;
    } | null>(null);

    const [migrating, setMigrating] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, currentPage: '' });
    const [result, setResult] = useState<{
        success: boolean;
        message: string;
        details?: string;
    } | null>(null);

    // Load migration status on mount
    useEffect(() => {
        if (pageId) return; // Skip for single page mode
        loadStatus();
    }, [workspaceId, pageId]);

    const loadStatus = async () => {
        try {
            const statusData = await getWorkspaceMigrationStatus(workspaceId);
            setStatus(statusData);
        } catch (error) {
            console.error('Failed to load migration status:', error);
        }
    };

    const handleMigratePage = async () => {
        if (!user || !pageId) return;

        setMigrating(true);
        setResult(null);

        try {
            const migrationResult = await migratePage(pageId, user.uid);

            if (migrationResult.success) {
                setResult({
                    success: true,
                    message: 'Page migrated successfully!',
                    details: `${migrationResult.blocksCreated} blocks created`,
                });
            } else {
                setResult({
                    success: false,
                    message: 'Migration failed',
                    details: migrationResult.error,
                });
            }
        } catch (error) {
            setResult({
                success: false,
                message: 'Migration failed',
                details: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setMigrating(false);
        }
    };

    const handleMigrateWorkspace = async () => {
        if (!user) return;

        setMigrating(true);
        setResult(null);
        setProgress({ current: 0, total: 0, currentPage: '' });

        try {
            const migrationResult = await migrateWorkspace(
                workspaceId,
                user.uid,
                (current, total, pageTitle) => {
                    setProgress({ current, total, currentPage: pageTitle });
                }
            );

            if (migrationResult.success) {
                setResult({
                    success: true,
                    message: 'Workspace migrated successfully!',
                    details: `${migrationResult.migratedPages} pages migrated, ${migrationResult.skippedPages} skipped`,
                });
                await loadStatus(); // Reload status
            } else {
                const errorDetails =
                    migrationResult.errors.length > 0
                        ? migrationResult.errors.map((e) => `${e.title}: ${e.error}`).join('\n')
                        : 'Unknown errors occurred';

                setResult({
                    success: false,
                    message: `Migration completed with errors`,
                    details: `${migrationResult.migratedPages} succeeded, ${migrationResult.failedPages} failed\n\n${errorDetails}`,
                });
                await loadStatus();
            }
        } catch (error) {
            setResult({
                success: false,
                message: 'Migration failed',
                details: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setMigrating(false);
            setProgress({ current: 0, total: 0, currentPage: '' });
        }
    };

    // Single page migration mode
    if (pageId) {
        return (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h3 className="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-100">
                    Migrate to Block System
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                    This page is using the old HTML format. Migrate to the new block-based system for better editing experience.
                </p>

                <button
                    onClick={handleMigratePage}
                    disabled={migrating}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                    {migrating ? (
                        <>
                            <RefreshCw size={16} className="animate-spin" />
                            Migrating...
                        </>
                    ) : (
                        <>
                            <ArrowRight size={16} />
                            Migrate Page
                        </>
                    )}
                </button>

                {result && (
                    <div
                        className={`mt-3 p-3 rounded-lg text-sm ${result.success
                                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                            }`}
                    >
                        <div className="flex items-start gap-2">
                            {result.success ? (
                                <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                            ) : (
                                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                            )}
                            <div>
                                <div className="font-medium">{result.message}</div>
                                {result.details && <div className="text-xs mt-1 opacity-80">{result.details}</div>}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Workspace migration mode
    return (
        <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Workspace Migration</h2>

            {status && (
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Migration Progress</span>
                        <span className="text-sm font-semibold">{status.percentComplete}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${status.percentComplete}%` }}
                        />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{status.migratedPages} migrated</span>
                        <span>{status.pendingPages} pending</span>
                        <span>{status.totalPages} total</span>
                    </div>
                </div>
            )}

            {progress.total > 0 && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-blue-900 dark:text-blue-100">
                        <RefreshCw size={14} className="animate-spin" />
                        <span>
                            Migrating {progress.current} of {progress.total}...
                        </span>
                    </div>
                    {progress.currentPage && (
                        <div className="text-xs text-blue-700 dark:text-blue-300 mt-1 truncate">
                            {progress.currentPage}
                        </div>
                    )}
                </div>
            )}

            <button
                onClick={handleMigrateWorkspace}
                disabled={migrating || (status?.pendingPages === 0)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
                {migrating ? (
                    <>
                        <RefreshCw size={18} className="animate-spin" />
                        Migrating Workspace...
                    </>
                ) : (
                    <>
                        <ArrowRight size={18} />
                        Migrate All Pages ({status?.pendingPages || 0} remaining)
                    </>
                )}
            </button>

            {result && (
                <div
                    className={`mt-4 p-4 rounded-lg ${result.success
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                            : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                        }`}
                >
                    <div className="flex items-start gap-2">
                        {result.success ? (
                            <CheckCircle size={20} className="mt-0.5 flex-shrink-0" />
                        ) : (
                            <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                            <div className="font-semibold">{result.message}</div>
                            {result.details && (
                                <div className="text-sm mt-2 whitespace-pre-wrap opacity-90">{result.details}</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
