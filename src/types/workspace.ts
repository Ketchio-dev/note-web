import { Timestamp } from 'firebase/firestore';

/**
 * Page update/activity log entry
 */
export interface PageUpdate {
    id: string;
    userId: string;
    action: 'view' | 'edit' | 'create' | 'delete' | 'comment';
    details: string;
    timestamp: Timestamp;
    userName?: string;
}

/**
 * Collaboration tracking
 */
export interface CollaborationActivity {
    pageId: string;
    userId: string;
    userName: string;
    action: string;
    timestamp: Date;
}
