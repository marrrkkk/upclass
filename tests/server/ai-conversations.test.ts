// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest"
import { NextRequest } from "next/server"
import type { RequestInit as NextRequestInit } from "next/dist/server/web/spec-extension/request"

const getSessionMock = vi.fn()
const getOrganizationMembershipMock = vi.fn()
const resolveAiSurfaceAccessMock = vi.fn()
const listDashboardMock = vi.fn()
const listClassMock = vi.fn()
const createConversationMock = vi.fn()
const getConversationMock = vi.fn()
const deleteConversationMock = vi.fn()

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}))

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}))

vi.mock("@/lib/org-validation", () => ({
  getOrganizationMembership: getOrganizationMembershipMock,
}))

vi.mock("@/lib/ai/access", () => ({
  resolveAiSurfaceAccess: resolveAiSurfaceAccessMock,
}))

vi.mock("@/lib/ai/conversations", () => ({
  listDashboardConversations: listDashboardMock,
  listClassConversations: listClassMock,
  createConversation: createConversationMock,
  getConversation: getConversationMock,
  deleteConversation: deleteConversationMock,
}))

const conversation = {
  id: "conv-1",
  userId: "user-1",
  orgId: "org-1",
  surface: "dashboard",
  entityId: "dashboard",
  title: "New chat",
  isDefault: false,
  lastMessageAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function makeRequest(url: string, init?: NextRequestInit) {
  return new NextRequest(new URL(url, "http://localhost"), init)
}

describe("GET /api/ai/conversations", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    getOrganizationMembershipMock.mockResolvedValue({ orgId: "org-1", role: "member" })
    resolveAiSurfaceAccessMock.mockResolvedValue({ allowed: true })
  })

  test("rejects unauthenticated requests", async () => {
    getSessionMock.mockResolvedValue(null)
    const { GET } = await import("@/app/api/ai/conversations/route")
    const response = await GET(makeRequest("/api/ai/conversations?orgSlug=acme&surface=dashboard"))
    expect(response.status).toBe(401)
  })

  test("rejects users without org membership", async () => {
    getOrganizationMembershipMock.mockResolvedValue(null)
    const { GET } = await import("@/app/api/ai/conversations/route")
    const response = await GET(makeRequest("/api/ai/conversations?orgSlug=acme&surface=dashboard"))
    expect(response.status).toBe(403)
  })

  test("lists dashboard conversations", async () => {
    listDashboardMock.mockResolvedValue([conversation])
    const { GET } = await import("@/app/api/ai/conversations/route")
    const response = await GET(makeRequest("/api/ai/conversations?orgSlug=acme&surface=dashboard"))
    expect(response.status).toBe(200)
    const body = (await response.json()) as { conversations: typeof conversation[] }
    expect(body.conversations[0]).toMatchObject({
      id: "conv-1",
      userId: "user-1",
      orgId: "org-1",
      surface: "dashboard",
      entityId: "dashboard",
      title: "New chat",
      lastMessageAt: null,
    })
    expect(listDashboardMock).toHaveBeenCalledWith("user-1", "org-1", undefined)
  })

  test("lists class conversations for a class entity", async () => {
    listClassMock.mockResolvedValue([])
    const { GET } = await import("@/app/api/ai/conversations/route")
    const response = await GET(
      makeRequest("/api/ai/conversations?orgSlug=acme&surface=class&classId=class-1"),
    )
    expect(response.status).toBe(200)
    expect(listClassMock).toHaveBeenCalledWith("user-1", "org-1", "class-1", undefined)
  })
})

describe("POST /api/ai/conversations", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    getOrganizationMembershipMock.mockResolvedValue({ orgId: "org-1", role: "member" })
    resolveAiSurfaceAccessMock.mockResolvedValue({ allowed: true })
  })

  test("creates a conversation", async () => {
    createConversationMock.mockResolvedValue(conversation)
    const { POST } = await import("@/app/api/ai/conversations/route")
    const response = await POST(
      makeRequest("/api/ai/conversations", {
        method: "POST",
        body: JSON.stringify({ orgSlug: "acme", surface: "dashboard", entityId: "dashboard" }),
      }),
    )
    expect(response.status).toBe(201)
    const body = (await response.json()) as { conversation: typeof conversation }
    expect(body.conversation.id).toBe("conv-1")
  })

  test("rejects an invalid body", async () => {
    const { POST } = await import("@/app/api/ai/conversations/route")
    const response = await POST(
      makeRequest("/api/ai/conversations", {
        method: "POST",
        body: JSON.stringify({ orgSlug: "acme" }),
      }),
    )
    expect(response.status).toBe(400)
  })
})

describe("GET/DELETE /api/ai/conversations/[conversationId]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } })
  })

  test("GET hides other users' conversations", async () => {
    getConversationMock.mockResolvedValue({ ...conversation, userId: "someone-else" })
    const { GET } = await import("@/app/api/ai/conversations/[conversationId]/route")
    const response = await GET(makeRequest("/api/ai/conversations/conv-1"), {
      params: Promise.resolve({ conversationId: "conv-1" }),
    } as never)
    expect(response.status).toBe(404)
  })

  test("DELETE removes the conversation and verifies org membership", async () => {
    getConversationMock.mockResolvedValue(conversation)
    getOrganizationMembershipMock.mockResolvedValue({ orgId: "org-1", role: "member" })
    const { DELETE } = await import("@/app/api/ai/conversations/[conversationId]/route")
    const response = await DELETE(makeRequest("/api/ai/conversations/conv-1", { method: "DELETE" }), {
      params: Promise.resolve({ conversationId: "conv-1" }),
    } as never)
    expect(response.status).toBe(200)
    expect(deleteConversationMock).toHaveBeenCalledWith("conv-1")
  })
})