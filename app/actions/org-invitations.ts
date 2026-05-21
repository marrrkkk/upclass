"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { eq, and } from "drizzle-orm"
import { Resend } from "resend"

import { db } from "@/db"
import { auth } from "@/lib/auth"
import { orgInvitation, orgMembership, user } from "@/db/schema"
import { createInvitationSchema } from "@/lib/validation/organizations"

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

async function getAuthenticatedUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  return session?.user ?? null
}

async function requireAdmin(orgId: string, userId: string): Promise<boolean> {
  const membership = await db
    .select({ role: orgMembership.role })
    .from(orgMembership)
    .where(
      and(
        eq(orgMembership.organizationId, orgId),
        eq(orgMembership.userId, userId)
      )
    )
    .limit(1)

  return membership.length > 0 && membership[0].role === "admin"
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  return new Resend(apiKey)
}

function getEmailFrom() {
  return process.env.EMAIL_FROM || "UpClass <notifications@upclass.xyz>"
}

function generateToken(): string {
  return crypto.randomUUID() + "-" + crypto.randomUUID()
}

// --------------------------------------------------------------------------
// createInvitation
// --------------------------------------------------------------------------

export async function createInvitation(
  orgId: string,
  email: string,
  role: string
): Promise<ActionResult<{ invitationId: string }>> {
  const currentUser = await getAuthenticatedUser()
  if (!currentUser?.id) {
    return { success: false, error: "Unauthorized" }
  }

  // Admin-only check
  const isAdmin = await requireAdmin(orgId, currentUser.id)
  if (!isAdmin) {
    return { success: false, error: "Insufficient permissions" }
  }

  // Validate input
  const parsed = createInvitationSchema.safeParse({ email, role })
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid invitation data",
    }
  }

  const normalizedEmail = parsed.data.email.toLowerCase().trim()

  // Check if user is already a member of this org
  const existingMember = await db
    .select({ id: user.id })
    .from(user)
    .innerJoin(orgMembership, eq(orgMembership.userId, user.id))
    .where(
      and(
        eq(user.email, normalizedEmail),
        eq(orgMembership.organizationId, orgId)
      )
    )
    .limit(1)

  if (existingMember.length > 0) {
    return {
      success: false,
      error: "User is already a member of this organization",
    }
  }

  // Check for existing pending invitation
  const existingInvite = await db
    .select({ id: orgInvitation.id })
    .from(orgInvitation)
    .where(
      and(
        eq(orgInvitation.organizationId, orgId),
        eq(orgInvitation.email, normalizedEmail),
        eq(orgInvitation.status, "pending")
      )
    )
    .limit(1)

  if (existingInvite.length > 0) {
    return {
      success: false,
      error: "A pending invitation already exists for this email",
    }
  }

  // Generate token and set expiry (7 days)
  const token = generateToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const invitationId = crypto.randomUUID()

  await db.insert(orgInvitation).values({
    id: invitationId,
    organizationId: orgId,
    email: normalizedEmail,
    role: parsed.data.role,
    token,
    invitedBy: currentUser.id,
    status: "pending",
    expiresAt,
  })

  // Send invitation email via Resend
  const resend = getResendClient()
  if (resend) {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const acceptUrl = `${appUrl}/invite/accept?token=${token}`

      await resend.emails.send({
        from: getEmailFrom(),
        to: [normalizedEmail],
        subject: "You've been invited to join an organization on UpClass",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>You've been invited to join an organization</h2>
            <p>You've been invited to join an organization on UpClass as a <strong>${parsed.data.role}</strong>.</p>
            <p>This invitation will expire in 7 days.</p>
            <a href="${acceptUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">
              Accept Invitation
            </a>
            <p style="margin-top: 16px; color: #6b7280; font-size: 14px;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        `,
      })
    } catch (error) {
      console.error("Failed to send invitation email", error)
      // Don't fail the invitation creation if email fails
    }
  }

  revalidatePath(`/`)

  return { success: true, data: { invitationId } }
}

// --------------------------------------------------------------------------
// listPendingInvitations
// --------------------------------------------------------------------------

export async function listPendingInvitations(
  orgId: string
): Promise<ActionResult<typeof results>> {
  const currentUser = await getAuthenticatedUser()
  if (!currentUser?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const isAdmin = await requireAdmin(orgId, currentUser.id)
  if (!isAdmin) {
    return { success: false, error: "Insufficient permissions" }
  }

  const results = await db
    .select({
      id: orgInvitation.id,
      email: orgInvitation.email,
      role: orgInvitation.role,
      status: orgInvitation.status,
      expiresAt: orgInvitation.expiresAt,
      createdAt: orgInvitation.createdAt,
      invitedBy: orgInvitation.invitedBy,
    })
    .from(orgInvitation)
    .where(
      and(
        eq(orgInvitation.organizationId, orgId),
        eq(orgInvitation.status, "pending")
      )
    )

  return { success: true, data: results }
}

// --------------------------------------------------------------------------
// cancelInvitation
// --------------------------------------------------------------------------

export async function cancelInvitation(
  orgId: string,
  invitationId: string
): Promise<ActionResult> {
  const currentUser = await getAuthenticatedUser()
  if (!currentUser?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const isAdmin = await requireAdmin(orgId, currentUser.id)
  if (!isAdmin) {
    return { success: false, error: "Insufficient permissions" }
  }

  const invitation = await db
    .select({ id: orgInvitation.id, status: orgInvitation.status })
    .from(orgInvitation)
    .where(
      and(
        eq(orgInvitation.id, invitationId),
        eq(orgInvitation.organizationId, orgId)
      )
    )
    .limit(1)

  if (invitation.length === 0) {
    return { success: false, error: "Invitation not found" }
  }

  if (invitation[0].status !== "pending") {
    return { success: false, error: "Only pending invitations can be cancelled" }
  }

  await db
    .update(orgInvitation)
    .set({ status: "cancelled" })
    .where(eq(orgInvitation.id, invitationId))

  revalidatePath(`/`)

  return { success: true }
}

// --------------------------------------------------------------------------
// acceptInvitation
// --------------------------------------------------------------------------

export async function acceptInvitation(
  token: string
): Promise<ActionResult<{ organizationId: string }>> {
  const currentUser = await getAuthenticatedUser()
  if (!currentUser?.id) {
    return { success: false, error: "Unauthorized" }
  }

  // Find the invitation by token
  const invitation = await db
    .select()
    .from(orgInvitation)
    .where(eq(orgInvitation.token, token))
    .limit(1)

  if (invitation.length === 0) {
    return { success: false, error: "Invitation not found" }
  }

  const invite = invitation[0]

  // Check status
  if (invite.status !== "pending") {
    return { success: false, error: "Invitation is no longer valid" }
  }

  // Check expiry
  if (new Date() > invite.expiresAt) {
    // Mark as expired
    await db
      .update(orgInvitation)
      .set({ status: "expired" })
      .where(eq(orgInvitation.id, invite.id))

    return { success: false, error: "Invitation has expired" }
  }

  // Check if user is already a member
  const existingMembership = await db
    .select({ id: orgMembership.id })
    .from(orgMembership)
    .where(
      and(
        eq(orgMembership.organizationId, invite.organizationId),
        eq(orgMembership.userId, currentUser.id)
      )
    )
    .limit(1)

  if (existingMembership.length > 0) {
    return {
      success: false,
      error: "User is already a member of this organization",
    }
  }

  // Accept in a transaction: create membership + mark invitation accepted
  await db.transaction(async (tx) => {
    await tx.insert(orgMembership).values({
      id: crypto.randomUUID(),
      organizationId: invite.organizationId,
      userId: currentUser.id,
      role: invite.role,
    })

    await tx
      .update(orgInvitation)
      .set({
        status: "accepted",
        acceptedAt: new Date(),
      })
      .where(eq(orgInvitation.id, invite.id))
  })

  revalidatePath(`/`)

  return { success: true, data: { organizationId: invite.organizationId } }
}
