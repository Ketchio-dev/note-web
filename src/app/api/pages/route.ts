import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, setDoc } from 'firebase/firestore';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get('workspaceId');

        if (!workspaceId) {
            return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
        }

        const q = query(collection(db, 'pages'), where('workspaceId', '==', workspaceId));
        const snapshot = await getDocs(q);

        const pages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return NextResponse.json({ pages });
    } catch (error: any) {
        console.error('List Pages Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { workspaceId, title, parentId, type, userId } = body;

        if (!workspaceId) {
            return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
        }

        // Logic similar to workspace.ts createPage
        const pageRef = doc(collection(db, "pages"));
        const newPage = {
            id: pageRef.id,
            workspaceId,
            parentId: parentId || null,
            title: title || "Untitled",
            content: "",
            type: type || 'page',
            section: 'workspace',
            createdBy: userId || 'api',
            properties: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            font: 'default',
            fullWidth: false,
            smallText: false,
            locked: false,
            inTrash: false,
            order: new Date().getTime()
        };

        // Use setDoc to match client-side logic if possible, or addDoc if ID auto-gen desired but we generated it.
        // workspace.ts uses setDoc with custom ID? No, it uses doc(collection(...)) then setDoc.
        // Wait, workspace.ts: `const pageRef = doc(collection(db, "pages"));` -> generates ID.
        // Then `await setDoc(pageRef, newPage);`.

        // We will do the same:
        await setDoc(pageRef, newPage);

        return NextResponse.json(newPage);
    } catch (error: any) {
        console.error('Create Page Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
