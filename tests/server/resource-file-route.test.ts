// @vitest-environment node

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const selectMock = vi.fn()
const fromMock = vi.fn()
const whereMock = vi.fn()
const limitMock = vi.fn()

vi.mock("@/db", () => ({
  db: {
    select: (...args: unknown[]) => selectMock(...args),
  },
}))

vi.mock("node:fs", () => ({
  createReadStream: vi.fn(),
}))

vi.mock("node:fs/promises", () => ({
  stat: vi.fn(),
}))

function mockDbRow(row: Record<string, unknown> | undefined) {
  selectMock.mockReturnValue({
    from: fromMock.mockReturnValue({
      where: whereMock.mockReturnValue({
        limit: limitMock.mockResolvedValue(row ? [row] : []),
      }),
    }),
  })
}

async function callGet(id: string) {
  const { GET } = await import("@/app/api/resources/[id]/file/route")
  return GET(new Request(`http://localhost/api/resources/${id}/file`), {
    params: Promise.resolve({ id }),
  })
}

describe("resource file route", () => {
  const env = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...env }
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
  })

  afterEach(() => {
    process.env = env
  })

  test("returns a plain 404 when the resource does not exist", async () => {
    mockDbRow(undefined)

    const response = await callGet("missing-id")

    expect(response.status).toBe(404)
    expect(await response.text()).toBe("Not found")
    expect(response.headers.get("content-type")).toContain("text/plain")
  })

  test("redirects to validated external storage URLs", async () => {
    mockDbRow({
      id: "res-1",
      fileUrl: "https://storage.example/res/res-1/file.pdf",
      fileName: "file.pdf",
      fileType: "pdf",
      storagePath: null,
    })

    const response = await callGet("res-1")

    expect(response.status).toBe(302)
    expect(response.headers.get("location")).toBe(
      "https://storage.example/res/res-1/file.pdf",
    )
    expect(response.headers.get("cache-control")).toBe("no-store")
  })

  test("serves seeded files inline with the correct content type", async () => {
    const { stat } = await import("node:fs/promises")
    const { createReadStream } = await import("node:fs")
    const { Readable } = await import("node:stream")

    vi.mocked(stat).mockResolvedValue({
      isFile: () => true,
      size: 11,
    } as never)
    ;(createReadStream as unknown as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Readable.from([Buffer.from("%PDF-seeded")]),
    )

    mockDbRow({
      id: "res-2",
      fileUrl: "/seeded-resources/notes.pdf",
      fileName: "notes.pdf",
      fileType: "pdf",
      storagePath: null,
    })

    const response = await callGet("res-2")

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("application/pdf")
    expect(response.headers.get("content-disposition")).toBe(
      'inline; filename="notes.pdf"',
    )
    expect(response.headers.get("content-length")).toBe("11")
    const bytes = Buffer.from(await (await response.arrayBuffer()))
    expect(bytes.toString()).toBe("%PDF-seeded")
  })

  test("returns 404 for seeded rows whose file is missing on disk", async () => {
    const { stat } = await import("node:fs/promises")
    vi.mocked(stat).mockRejectedValue(new Error("enoent"))

    mockDbRow({
      id: "res-3",
      fileUrl: "/seeded-resources/gone.txt",
      fileName: "gone.txt",
      fileType: "txt",
      storagePath: null,
    })

    const response = await callGet("res-3")

    expect(response.status).toBe(404)
  })

  test("repairs legacy app-route rows through their storage path", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test"

    mockDbRow({
      id: "res-4",
      fileUrl: "/academy/resources/res-4",
      fileName: "upload.pdf",
      fileType: "pdf",
      storagePath: "user-1/object.pdf",
    })

    const response = await callGet("res-4")

    expect(response.status).toBe(302)
    expect(response.headers.get("location")).toBe(
      "https://supabase.test/storage/v1/object/public/resources/user-1/object.pdf",
    )
  })

  test("returns 404 when a legacy row cannot be repaired", async () => {
    mockDbRow({
      id: "res-5",
      fileUrl: "/academy/dashboard",
      fileName: null,
      fileType: "other",
      storagePath: null,
    })

    const response = await callGet("res-5")

    expect(response.status).toBe(404)
  })
})
