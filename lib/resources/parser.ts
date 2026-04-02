import "server-only"

import mammoth from "mammoth"

import type { ParsedResourceBlock, ParsedResourceDocument } from "@/lib/resources/types"

type PdfJsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs")

let pdfJsModulePromise: Promise<PdfJsModule> | null = null
let pdfJsWorkerPromise: Promise<void> | null = null

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.trim().toLowerCase() ?? ""
}

async function getPdfJsModule() {
  pdfJsModulePromise ??= import("pdfjs-dist/legacy/build/pdf.mjs")
  return await pdfJsModulePromise
}

async function ensurePdfJsWorker() {
  if (!process.versions?.node) {
    return
  }

  const workerHost = globalThis as typeof globalThis & {
    pdfjsWorker?: {
      WorkerMessageHandler?: unknown
    }
  }

  if (workerHost.pdfjsWorker?.WorkerMessageHandler) {
    return
  }

  pdfJsWorkerPromise ??= import("pdfjs-dist/legacy/build/pdf.worker.mjs").then(
    (workerModule) => {
      workerHost.pdfjsWorker = workerModule
    },
  )

  await pdfJsWorkerPromise
}

function splitParagraphBlocks(text: string, sectionLabel?: string | null) {
  return text
    .split(/\n\s*\n/g)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map<ParsedResourceBlock>((entry) => ({
      text: entry,
      pageNumber: null,
      sectionLabel: sectionLabel ?? null,
    }))
}

async function parsePdfDocument(arrayBuffer: ArrayBuffer): Promise<ParsedResourceDocument> {
  const pdfjs = await getPdfJsModule()
  await ensurePdfJsWorker()
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(arrayBuffer),
    useWorkerFetch: false,
    isEvalSupported: false,
  })
  const pdf = await loadingTask.promise
  const blocks: ParsedResourceBlock[] = []

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()

    if (!pageText) continue

    blocks.push({
      text: pageText,
      pageNumber: pageIndex,
      sectionLabel: `Page ${pageIndex}`,
    })
  }

  return {
    parser: "pdfjs-dist",
    text: blocks.map((block) => block.text).join("\n\n"),
    blocks,
    pageCount: pdf.numPages,
  }
}

async function parseDocxDocument(arrayBuffer: ArrayBuffer): Promise<ParsedResourceDocument> {
  const result = await mammoth.extractRawText({
    buffer: Buffer.from(arrayBuffer),
  })
  const text = result.value.trim()

  return {
    parser: "mammoth",
    text,
    blocks: splitParagraphBlocks(text, "Document"),
    pageCount: 0,
  }
}

function decodeTextFile(arrayBuffer: ArrayBuffer) {
  const buffer = Buffer.from(arrayBuffer)
  const hasUtf16Markers = buffer.length > 1 && (buffer[0] === 0xff || buffer[0] === 0xfe)

  if (hasUtf16Markers) {
    return new TextDecoder("utf-16").decode(buffer)
  }

  return new TextDecoder("utf-8", { fatal: false }).decode(buffer)
}

async function parseTextDocument(arrayBuffer: ArrayBuffer): Promise<ParsedResourceDocument> {
  const text = decodeTextFile(arrayBuffer).trim()
  const blocks = text
    .split(/\n{2,}/g)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map<ParsedResourceBlock>((entry, index) => ({
      text: entry,
      pageNumber: null,
      sectionLabel: `Section ${index + 1}`,
    }))

  return {
    parser: "text",
    text,
    blocks,
    pageCount: 0,
  }
}

export class UnsupportedResourceTypeError extends Error {
  constructor(fileName: string) {
    super(`Unsupported resource type for AI ingestion: ${fileName}`)
    this.name = "UnsupportedResourceTypeError"
  }
}

export async function parseResourceDocument(args: {
  fileName: string
  mimeType?: string | null
  arrayBuffer: ArrayBuffer
}) {
  const extension = getFileExtension(args.fileName)

  if (extension === "pdf" || args.mimeType === "application/pdf") {
    return await parsePdfDocument(args.arrayBuffer)
  }

  if (
    extension === "docx" ||
    args.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return await parseDocxDocument(args.arrayBuffer)
  }

  if (extension === "txt" || args.mimeType?.startsWith("text/")) {
    return await parseTextDocument(args.arrayBuffer)
  }

  throw new UnsupportedResourceTypeError(args.fileName)
}
