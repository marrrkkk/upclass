// @vitest-environment node

import { afterEach, describe, expect, test, vi } from "vitest"

import { ExtractionError, extractResourceText } from "@/lib/resource-text-extraction"

function createPdfWithText(text: string) {
  const content = `BT\n/F1 18 Tf\n72 720 Td\n(${text}) Tj\nET`
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ]
  const offsets: number[] = []
  let pdf = "%PDF-1.4\n"

  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf))
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  }

  const xrefOffset = Buffer.byteLength(pdf)
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.map((offset) => `${offset.toString().padStart(10, "0")} 00000 n \n`).join("")
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return Buffer.from(pdf)
}

describe("extractResourceText", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test("extracts PDF text using the embedded pdf-parse worker", async () => {
    const pdf = createPdfWithText("Resource grounded learning")
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(pdf))

    await expect(
      extractResourceText({ fileType: "pdf", fileUrl: "https://storage.example/resource.pdf" }),
    ).resolves.toContain("Resource grounded learning")
  })

  test("rejects with an ExtractionError when the file download fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("network error"))

    await expect(
      extractResourceText({ fileType: "txt", fileUrl: "https://storage.example/resource.txt" }),
    ).rejects.toBeInstanceOf(ExtractionError)
  })

  test("rejects with an ExtractionError when the file cannot be parsed", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(Buffer.from("not really a pdf"), {
        headers: { "Content-Type": "application/pdf" },
      }),
    )

    await expect(
      extractResourceText({ fileType: "pdf", fileUrl: "https://storage.example/resource.pdf" }),
    ).rejects.toBeInstanceOf(ExtractionError)
  })
})
