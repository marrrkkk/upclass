import {
  classifyResourceFileUrl,
  inlineContentDisposition,
  isSafeResourceFileName,
  isSafeStoragePath,
  resolveResourceFileSrc,
  resourceContentType,
  storagePublicUrl,
  suggestRepairedResourceUrl,
} from "@/lib/resource-file"

describe("classifyResourceFileUrl", () => {
  test("classifies seeded paths", () => {
    expect(classifyResourceFileUrl("/seeded-resources/notes.pdf")).toEqual({
      kind: "seeded",
      fileName: "notes.pdf",
    })
    expect(classifyResourceFileUrl(" /seeded-resources/reviewer%202.pdf ")).toEqual(
      {
        kind: "seeded",
        fileName: "reviewer 2.pdf",
      },
    )
  })

  test("rejects traversal and nested paths inside seeded prefix", () => {
    expect(classifyResourceFileUrl("/seeded-resources/../secrets.env")).toEqual({
      kind: "app-route",
    })
    expect(classifyResourceFileUrl("/seeded-resources/a/b.pdf")).toEqual({
      kind: "app-route",
    })
    expect(classifyResourceFileUrl("/seeded-resources/%2e%2e/x.pdf")).toEqual({
      kind: "app-route",
    })
  })

  test("classifies http(s) URLs as external", () => {
    expect(classifyResourceFileUrl("https://storage.example/res/file.pdf")).toEqual({
      kind: "external",
      url: "https://storage.example/res/file.pdf",
    })
    expect(classifyResourceFileUrl("http://cdn.example/file.txt")).toEqual({
      kind: "external",
      url: "http://cdn.example/file.txt",
    })
  })

  test("treats legacy app routes as app-route", () => {
    expect(classifyResourceFileUrl("/academy/resources/res-1")).toEqual({
      kind: "app-route",
    })
    expect(classifyResourceFileUrl("/resources/res-1")).toEqual({
      kind: "app-route",
    })
    expect(classifyResourceFileUrl("/academy/dashboard")).toEqual({
      kind: "app-route",
    })
  })

  test("never allows non-http schemes to be embedded directly", () => {
    expect(classifyResourceFileUrl("javascript:alert(1)")).toEqual({
      kind: "app-route",
    })
    expect(classifyResourceFileUrl("data:text/html,<script>alert(1)</script>")).toEqual(
      { kind: "app-route" },
    )
    expect(classifyResourceFileUrl("//evil.example/file.pdf")).toEqual({
      kind: "app-route",
    })
  })

  test("handles empty values", () => {
    expect(classifyResourceFileUrl(null)).toEqual({ kind: "app-route" })
    expect(classifyResourceFileUrl(undefined)).toEqual({ kind: "app-route" })
    expect(classifyResourceFileUrl("   ")).toEqual({ kind: "app-route" })
  })
})

describe("resolveResourceFileSrc", () => {
  test("keeps validated seeded and external sources direct", () => {
    expect(
      resolveResourceFileSrc({ id: "r1", fileUrl: "/seeded-resources/notes.pdf" }),
    ).toBe("/seeded-resources/notes.pdf")
    expect(
      resolveResourceFileSrc({
        id: "r1",
        fileUrl: "https://storage.example/r1/file.pdf",
      }),
    ).toBe("https://storage.example/r1/file.pdf")
  })

  test("routes legacy app-route rows through the access-checked file endpoint", () => {
    expect(
      resolveResourceFileSrc({ id: "res-1", fileUrl: "/academy/resources/res-1" }),
    ).toBe("/api/resources/res-1/file")
  })

  test("encodes ids with special characters in the proxy URL", () => {
    expect(
      resolveResourceFileSrc({ id: "a b/c", fileUrl: "" }),
    ).toBe("/api/resources/a%20b%2Fc/file")
  })
})

describe("suggestRepairedResourceUrl", () => {
  const env = process.env

  beforeEach(() => {
    process.env = { ...env }
  })

  afterEach(() => {
    process.env = env
  })

  test("returns null when the stored url is already valid", () => {
    expect(
      suggestRepairedResourceUrl({
        fileUrl: "/seeded-resources/notes.pdf",
        storagePath: null,
        fileName: "notes.pdf",
      }),
    ).toBeNull()
    expect(
      suggestRepairedResourceUrl({
        fileUrl: "https://storage.example/x.pdf",
        storagePath: null,
        fileName: "x.pdf",
      }),
    ).toBeNull()
  })

  test("prefers the storage bucket when a safe storagePath exists", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test"
    expect(
      suggestRepairedResourceUrl({
        fileUrl: "/academy/resources/res-1",
        storagePath: "user-1/uuid-1.pdf",
        fileName: "file.pdf",
      }),
    ).toBe("https://supabase.test/storage/v1/object/public/resources/user-1/uuid-1.pdf")
  })

  test("falls back to a seeded path derived from fileName", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    expect(
      suggestRepairedResourceUrl({
        fileUrl: "/academy/resources/res-1",
        storagePath: null,
        fileName: "worksheet.pdf",
      }),
    ).toBe("/seeded-resources/worksheet.pdf")
  })

  test("rejects unsafe storage paths before building a URL", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test"
    expect(
      suggestRepairedResourceUrl({
        fileUrl: "/academy/resources/res-1",
        storagePath: "../other-user/secret.pdf",
        fileName: null,
      }),
    ).toBeNull()
  })

  test("returns null when nothing can be derived", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    expect(
      suggestRepairedResourceUrl({
        fileUrl: "/academy/resources/res-1",
        storagePath: null,
        fileName: null,
      }),
    ).toBeNull()
  })
})

describe("safety predicates and response headers", () => {
  test("isSafeResourceFileName blocks traversal and separators", () => {
    expect(isSafeResourceFileName("notes.pdf")).toBe(true)
    expect(isSafeResourceFileName("../notes.pdf")).toBe(false)
    expect(isSafeResourceFileName("a/b.pdf")).toBe(false)
    expect(isSafeResourceFileName("a\\b.pdf")).toBe(false)
    expect(isSafeResourceFileName("")).toBe(false)
    expect(isSafeResourceFileName(null)).toBe(false)
  })

  test("isSafeStoragePath requires clean multi-segment paths", () => {
    expect(isSafeStoragePath("user-1/file.pdf")).toBe(true)
    expect(isSafeStoragePath("user-1/folder/file.pdf")).toBe(true)
    expect(isSafeStoragePath("file.pdf")).toBe(false)
    expect(isSafeStoragePath("/absolute/file.pdf")).toBe(false)
    expect(isSafeStoragePath("user-1/../file.pdf")).toBe(false)
    expect(isSafeStoragePath(null)).toBe(false)
  })

  test("storagePublicUrl needs both base URL and safe path", () => {
    const env = process.env
    process.env = { ...env }
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    expect(storagePublicUrl("u/f.pdf")).toBeNull()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test/"
    expect(storagePublicUrl("u/f.pdf")).toBe(
      "https://supabase.test/storage/v1/object/public/resources/u/f.pdf",
    )
    expect(storagePublicUrl("../escape.pdf")).toBeNull()
    process.env = env
  })

  test("resourceContentType maps known types and falls back to octet-stream", () => {
    expect(resourceContentType("pdf")).toBe("application/pdf")
    expect(resourceContentType("TXT")).toBe("text/plain; charset=utf-8")
    expect(resourceContentType("docx")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
    expect(resourceContentType("weird")).toBe("application/octet-stream")
    expect(resourceContentType(null)).toBe("application/octet-stream")
  })

  test("inlineContentDisposition strips header-breaking characters", () => {
    expect(inlineContentDisposition('re"port.pdf')).toBe('inline; filename="report.pdf"')
    expect(inlineContentDisposition("line\nbreak.pdf")).toBe('inline; filename="linebreak.pdf"')
    expect(inlineContentDisposition("   ")).toBe('inline; filename="file"')
  })
})
