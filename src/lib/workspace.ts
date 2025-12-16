import { db } from "./firebase";
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    serverTimestamp,
    orderBy,
    deleteDoc,
    arrayUnion,
    onSnapshot, // Import onSnapshot
    setDoc
} from "firebase/firestore";

export interface Workspace {
    id: string;
    name: string;
    ownerId: string;
    members: string[];
    createdAt?: any;
}

export interface Page {
    id: string;
    workspaceId: string;
    parentId: string | null;
    title: string;
    icon?: string;
    cover?: string;
    content?: string; // HTML content from Tiptap
    createdAt?: any;
    updatedAt?: any;
    isExpanded?: boolean; // For sidebar UI state

    // Organization
    section?: 'private' | 'workspace';
    createdBy?: string;
    order?: number;

    // Database Fields
    type: 'page' | 'database';
    properties?: {
        id: string;
        name: string;
        type: 'text' | 'number' | 'select' | 'multi-select' | 'date' | 'person' |
        'files' | 'checkbox' | 'url' | 'email' | 'phone' | 'formula' |
        'relation' | 'rollup' | 'created_time' | 'created_by' | 'last_edited_time' | 'last_edited_by' | 'progress';
        // For select/multi-select
        options?: { id: string; name: string; color: string }[];
        // For formula
        formula?: string;
        // For relation
        relationTo?: string; // Target database ID
        // For rollup
        rollupRelation?: string; // Relation property ID
        rollupProperty?: string; // Property to rollup
        rollupFunction?: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'show_original';
        // For progress
        max?: number; // Maximum value for progress (default: 100)
        progressColor?: string; // Color for progress bar
    }[];
    propertyValues?: Record<string, any>; // Keyed by property ID

    // Saved Views for databases
    savedViews?: {
        id: string;
        name: string;
        viewType: 'table' | 'list' | 'board' | 'gallery' | 'calendar' | 'timeline' | 'chart';
        filters?: any;
        sorts?: any[];
        isDefault?: boolean;
    }[];

    // Page Options
    font?: 'default' | 'serif' | 'mono';
    fullWidth?: boolean;
    smallText?: boolean;
    locked?: boolean;

    // Trash
    inTrash?: boolean;
    trashDate?: any;

    // Meta
    isFavorite?: boolean;
}

// --- Simple Page Cache ---
interface CacheEntry {
    data: Page;
    timestamp: number;
}

const pageCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Clear expired cache entries
 */
function clearExpiredCache() {
    const now = Date.now();
    for (const [key, entry] of pageCache.entries()) {
        if (now - entry.timestamp > CACHE_TTL) {
            pageCache.delete(key);
        }
    }
}

/**
 * Invalidate cache for a specific page
 */
function invalidatePageCache(pageId: string) {
    pageCache.delete(pageId);
}

// Clear expired cache every minute
if (typeof window !== 'undefined') {
    setInterval(clearExpiredCache, 60 * 1000);
}

// --- Workspaces ---

export async function createWorkspace(ownerId: string, name: string): Promise<Workspace> {
    const docRef = await addDoc(collection(db, "workspaces"), {
        ownerId,
        name,
        members: [ownerId],
        createdAt: serverTimestamp()
    });
    return { id: docRef.id, ownerId, name, members: [ownerId] };
}

export async function getWorkspace(workspaceId: string): Promise<Workspace | null> {
    const docRef = doc(db, "workspaces", workspaceId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Workspace;
    }
    return null;
}

export async function getUserWorkspaces(userId: string): Promise<Workspace[]> {
    const q = query(collection(db, "workspaces"), where("members", "array-contains", userId));
    const snapshot = await getDocs(q);

    const workspaces: Workspace[] = [];
    snapshot.forEach(doc => {
        workspaces.push({ id: doc.id, ...doc.data() } as Workspace);
    });

    return workspaces;
}

// --- Pages ---

export const createPage = async (
    workspaceId: string,
    parentId: string | null = null,
    title: string = "Untitled",
    type: 'page' | 'database' = 'page',
    section: 'private' | 'workspace' = 'workspace',
    userId: string = ""
) => {
    // Check for existing "Untitled" pages to generate unique name if title is default
    let finalTitle = title;

    // Generic Unique Title Logic (No Index Required)
    // 1. Fetch all titles in this workspace to check for duplicates in-memory
    // This avoids "Missing Index" errors for range queries
    const pagesRef = collection(db, "pages");
    const q = query(pagesRef, where("workspaceId", "==", workspaceId));
    const snapshot = await getDocs(q);

    // Set of existing titles for fast lookup
    const existingTitles = new Set<string>();
    snapshot.forEach(doc => existingTitles.add(doc.data().title));

    let count = 2;

    // 2. Loop until we find a free title
    // Format: "Title", "Title_2", "Title_3"...
    while (existingTitles.has(finalTitle)) {
        finalTitle = `${title}_${count}`;
        count++;
    }

    const pageRef = doc(collection(db, "pages"));
    const newPage: Page = {
        id: pageRef.id,
        workspaceId,
        parentId: parentId || null,
        title: finalTitle,
        content: "",
        type,
        section,
        createdBy: userId,
        properties: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        font: 'default',
        fullWidth: false,
        smallText: false,
        locked: false,
        inTrash: false,
        order: new Date().getTime() // Initial order by creation time
    };
    await setDoc(pageRef, newPage);
    return newPage;
};

export async function getWorkspacePages(workspaceId: string): Promise<Page[]> {
    // Determine sort algorithm - for now create time
    const q = query(
        collection(db, "pages"),
        where("workspaceId", "==", workspaceId)
    );
    // Note: composite index may be required for workspaceId + orderBy together later.

    const snapshot = await getDocs(q);
    const pages: Page[] = [];
    snapshot.forEach(doc => {
        pages.push({ id: doc.id, ...doc.data() } as Page);
    });

    return pages;
}

export async function getChildPages(parentId: string): Promise<Page[]> {
    const q = query(
        collection(db, "pages"),
        where("parentId", "==", parentId)
    );
    const snapshot = await getDocs(q);
    const pages: Page[] = [];
    snapshot.forEach(doc => {
        pages.push({ id: doc.id, ...doc.data() } as Page);
    });
    return pages;
}

// Get a single page by ID with caching
export async function getPage(pageId: string): Promise<Page | null> {
    // Check cache first
    const cached = pageCache.get(pageId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    const docRef = doc(db, "pages", pageId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        const page = { id: snap.id, ...snap.data() } as Page;
        // Store in cache
        pageCache.set(pageId, { data: page, timestamp: Date.now() });
        return page;
    }
    return null;
}

export async function updatePage(pageId: string, data: Partial<Page>): Promise<void> {
    const docRef = doc(db, "pages", pageId);
    await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
    });

    // Invalidate cache for updated page
    invalidatePageCache(pageId);
}

export async function movePage(pageId: string, newParentId: string | null, newOrder: number) {
    const docRef = doc(db, "pages", pageId);
    await updateDoc(docRef, {
        parentId: newParentId,
        order: newOrder,
        updatedAt: serverTimestamp()
    });
}

export async function deletePage(pageId: string) {
    // Note: This needs to recursively delete children in a real production app.
    // For MVP, we just delete the node. Children become orphans (or hidden).
    await deleteDoc(doc(db, "pages", pageId));
}

export function subscribeToWorkspacePages(workspaceId: string, callback: (pages: Page[]) => void) {
    const q = query(
        collection(db, "pages"),
        where("workspaceId", "==", workspaceId)
    );
    return onSnapshot(q, (snapshot) => {
        const pages: Page[] = [];
        snapshot.forEach(doc => {
            pages.push({ id: doc.id, ...doc.data() } as Page);
        });
        callback(pages);
    });
}

export function subscribeToPage(pageId: string, callback: (page: Page | null) => void) {
    const docRef = doc(db, "pages", pageId);
    return onSnapshot(docRef, (docSnap) => {
        // Ignore local writes to prevent overwriting user input
        if (docSnap.metadata.hasPendingWrites) {
            return; // Skip local writes
        }

        if (docSnap.exists()) {
            callback({ id: docSnap.id, ...docSnap.data() } as Page);
        } else {
            callback(null);
        }
    });
}

export function subscribeToChildPages(parentId: string, callback: (pages: Page[]) => void) {
    const q = query(
        collection(db, "pages"),
        where("parentId", "==", parentId)
    );
    return onSnapshot(q, (snapshot) => {
        const pages: Page[] = [];
        snapshot.forEach(doc => {
            pages.push({ id: doc.id, ...doc.data() } as Page);
        });
        callback(pages);
    });
}

// --- Members ---

export async function addMemberToWorkspace(workspaceId: string, email: string) {
    // 1. Find User by Email
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        throw new Error("User not found with this email");
    }

    const userToAdd = snapshot.docs[0];
    const uid = userToAdd.id;

    // 2. Add to Workspace
    const wsRef = doc(db, "workspaces", workspaceId);
    await updateDoc(wsRef, {
        members: arrayUnion(uid)
    });

    return { uid, ...userToAdd.data() };
}

export async function getWorkspaceMembers(workspaceId: string) {
    const wsRef = doc(db, "workspaces", workspaceId);
    const wsSnap = await getDoc(wsRef);

    if (!wsSnap.exists()) return [];

    const memberIds = wsSnap.data().members || [];
    const members = [];

    // Ideally use 'in' query if list is small, or parallel fetches
    for (const uid of memberIds) {
        const userSnap = await getDoc(doc(db, "users", uid));
        if (userSnap.exists()) {
            members.push({ uid, ...userSnap.data() });
        }
    }
    return members;
}

// --- Collaboration: Updates & Analytics ---

export async function trackPageView(pageId: string, userId: string) {
    if (!pageId || !userId) return;
    try {
        // Add to subcollection 'views'
        const viewsRef = collection(db, "pages", pageId, "views");
        await addDoc(viewsRef, {
            userId,
            timestamp: serverTimestamp()
        });
    } catch (e) {
        console.error("Failed to track view", e);
    }
}

export async function trackPageUpdate(pageId: string, userId: string, action: string, details?: string) {
    if (!pageId || !userId) return;
    try {
        const updatesRef = collection(db, "pages", pageId, "updates");
        await addDoc(updatesRef, {
            userId,
            action,
            details: details || "",
            timestamp: serverTimestamp()
        });
    } catch (e) {
        console.error("Failed to track update", e);
    }
}

export function subscribeToPageUpdates(pageId: string, callback: (updates: any[]) => void) {
    const updatesRef = collection(db, "pages", pageId, "updates");
    const q = query(updatesRef, orderBy("timestamp", "desc")); // Newest first

    return onSnapshot(q, (snapshot) => {
        const updates: any[] = [];
        snapshot.forEach(doc => {
            updates.push({ id: doc.id, ...doc.data() });
        });
        callback(updates);
    });
}

export async function getPageAnalytics(pageId: string) {
    // For MVP, just get all views and aggregate in-memory.
    // In production, use Firebase Aggregation Queries or a scheduled function.
    const viewsRef = collection(db, "pages", pageId, "views");
    // Limit to last ~1000 views to be safe for now
    // Or just query last 30 days
    // const thirtyDaysAgo = new Date();
    // thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const snapshot = await getDocs(query(viewsRef, orderBy("timestamp", "desc"))); // Simple fetch all for now

    const views: any[] = [];
    const uniqueViewers = new Set<string>();

    snapshot.forEach(doc => {
        const data = doc.data();
        views.push({ id: doc.id, ...data });
        if (data.userId) uniqueViewers.add(data.userId);
    });

    return {
        totalViews: views.length,
        uniqueViewers: uniqueViewers.size,
        views // Return raw list for client-side charting (group by date)
    };
}
