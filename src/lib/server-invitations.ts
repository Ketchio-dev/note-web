import { getAdminFirestore } from '@/lib/firebase-admin';

export interface InvitationData {
    id: string;
    pageId?: string;
    workspaceId?: string;
    email?: string;
    role?: string;
    invitedBy?: string;
    accepted?: boolean;
    status?: string;
    type?: 'page' | 'workspace';
    [key: string]: unknown;
}

export interface InvitationActor {
    uid: string;
    email?: string;
}

function normalizedEmail(value?: string): string | undefined {
    return value ? value.toLowerCase() : undefined;
}

function canInvitationInviteeAct(invitation: InvitationData, actor: InvitationActor): boolean {
    const inviteeEmail = normalizedEmail(invitation.email);
    const actorEmail = normalizedEmail(actor.email);

    if (inviteeEmail && actorEmail) {
        return inviteeEmail === actorEmail;
    }

    return false;
}

export function canViewInvitation(invitation: InvitationData, actor: InvitationActor): boolean {
    return invitation.invitedBy === actor.uid || canInvitationInviteeAct(invitation, actor);
}

function getPagePermissions(page: Record<string, unknown>, uidFallback: string) {
    const raw = page.permissions;

    if (!raw || typeof raw !== 'object') {
        return {
            owner: (page.ownerId as string) || (page.createdBy as string) || uidFallback,
            shared: {} as Record<string, string>,
            generalAccess: 'private' as 'private' | 'public',
        };
    }

    const parsed = raw as {
        owner?: string;
        shared?: Record<string, string>;
        generalAccess?: 'private' | 'public';
    };

    return {
        owner: parsed.owner || (page.ownerId as string) || (page.createdBy as string) || uidFallback,
        shared: parsed.shared || {},
        generalAccess: parsed.generalAccess || 'private',
    };
}

export async function acceptInvitation(invitationId: string, actor: InvitationActor): Promise<InvitationData> {
    const db = getAdminFirestore();

    return db.runTransaction(async (tx) => {
        const invitationRef = db.collection('invitations').doc(invitationId);
        const invitationSnap = await tx.get(invitationRef);

        if (!invitationSnap.exists) {
            throw new Error('INVITATION_NOT_FOUND');
        }

        const invitation = { id: invitationSnap.id, ...invitationSnap.data() } as InvitationData;

        if (!canInvitationInviteeAct(invitation, actor)) {
            throw new Error('INVITATION_EMAIL_MISMATCH');
        }

        const alreadyAccepted = invitation.accepted || invitation.status === 'accepted';
        if (!alreadyAccepted) {
            tx.set(
                invitationRef,
                {
                    accepted: true,
                    status: 'accepted',
                    acceptedBy: actor.uid,
                    acceptedAt: new Date(),
                    updatedAt: new Date(),
                },
                { merge: true }
            );
        }

        if (invitation.workspaceId) {
            const workspaceRef = db.collection('workspaces').doc(invitation.workspaceId);
            const workspaceSnap = await tx.get(workspaceRef);

            if (workspaceSnap.exists) {
                const workspace = workspaceSnap.data() as {
                    members?: string[];
                    memberRoles?: Record<string, string[]>;
                };

                const members = Array.isArray(workspace.members) ? [...workspace.members] : [];
                if (!members.includes(actor.uid)) {
                    members.push(actor.uid);
                }

                const memberRoles = {
                    ...(workspace.memberRoles || {}),
                    [actor.uid]: workspace.memberRoles?.[actor.uid] || ['read'],
                };

                tx.set(
                    workspaceRef,
                    {
                        members,
                        memberRoles,
                        updatedAt: new Date(),
                    },
                    { merge: true }
                );
            }
        }

        if (invitation.pageId) {
            const pageRef = db.collection('pages').doc(invitation.pageId);
            const pageSnap = await tx.get(pageRef);

            if (pageSnap.exists) {
                const page = pageSnap.data() as Record<string, unknown>;
                const permissions = getPagePermissions(page, actor.uid);
                permissions.shared[actor.uid] = invitation.role || 'viewer';

                tx.set(
                    pageRef,
                    {
                        permissions,
                        updatedAt: new Date(),
                    },
                    { merge: true }
                );
            }
        }

        return {
            ...invitation,
            accepted: true,
            status: 'accepted',
            acceptedBy: actor.uid,
        };
    });
}

export async function rejectInvitation(invitationId: string, actor: InvitationActor): Promise<InvitationData> {
    const db = getAdminFirestore();

    return db.runTransaction(async (tx) => {
        const invitationRef = db.collection('invitations').doc(invitationId);
        const invitationSnap = await tx.get(invitationRef);

        if (!invitationSnap.exists) {
            throw new Error('INVITATION_NOT_FOUND');
        }

        const invitation = { id: invitationSnap.id, ...invitationSnap.data() } as InvitationData;

        if (!canInvitationInviteeAct(invitation, actor)) {
            throw new Error('INVITATION_EMAIL_MISMATCH');
        }

        tx.set(
            invitationRef,
            {
                accepted: false,
                status: 'rejected',
                rejectedBy: actor.uid,
                rejectedAt: new Date(),
                updatedAt: new Date(),
            },
            { merge: true }
        );

        return {
            ...invitation,
            accepted: false,
            status: 'rejected',
        };
    });
}
