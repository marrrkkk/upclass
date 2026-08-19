const MAX_EXTRACTED_CHARACTERS = 60_000

export type ExtractableResource = {
  fileType: "pdf" | "docx" | "xlsx" | "txt" | "other" | "doc" | "xls" | "ppt" | "pptx"
  fileUrl: string
}

export class ExtractionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ExtractionError"
  }
}

function truncateText(text: string) {
  const normalized = text.replace(/\u0000/g, "").trim()
  if (normalized.length <= MAX_EXTRACTED_CHARACTERS) return normalized

  return `${normalized.slice(0, MAX_EXTRACTED_CHARACTERS)}\n\n[Source text truncated after ${MAX_EXTRACTED_CHARACTERS.toLocaleString()} characters.]`
}

async function spreadsheetText(buffer: Buffer) {
  const XLSX = await import("xlsx")
  const workbook = XLSX.read(buffer, { type: "buffer" })
  return workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName]
    return `Sheet: ${sheetName}\n${XLSX.utils.sheet_to_csv(sheet)}`
  }).join("\n\n")
}

/**
 * Downloads and extracts textual content from a trusted resource URL. File text is
 * treated as data by the caller, never as instructions for the assistant.
 */
export async function extractResourceText(resource: ExtractableResource): Promise<string> {
  if (["doc", "xls", "ppt", "pptx"].includes(resource.fileType)) {
    throw new ExtractionError(`Chat with ${resource.fileType.toUpperCase()} files is not supported yet. Upload a PDF, DOCX, XLSX, or text file instead.`)
  }

  const fileResponse = await fetch(resource.fileUrl).catch(() => {
    throw new ExtractionError("Could not retrieve the resource file")
  })
  if (!fileResponse.ok) {
    throw new ExtractionError("Could not retrieve the resource file")
  }

  let buffer: Buffer
  try {
    buffer = Buffer.from(await fileResponse.arrayBuffer())
  } catch {
    throw new ExtractionError("Could not retrieve the resource file")
  }

  let text: string

  try {
    switch (resource.fileType) {
      case "pdf": {
        const [{ PDFParse }, { getData: getWorkerData }] = await Promise.all([
          import("pdf-parse"),
          import("pdf-parse/worker"),
        ])
        PDFParse.setWorker(getWorkerData())
        const parser = new PDFParse({ data: buffer })
        try {
          text = (await parser.getText()).text
        } finally {
          await parser.destroy()
        }
        break
      }
      case "docx": {
        const mammoth = (await import("mammoth")).default
        text = (await mammoth.extractRawText({ buffer })).value
        break
      }
      case "xlsx":
        text = await spreadsheetText(buffer)
        break
      case "txt":
      case "other":
        text = new TextDecoder("utf-8").decode(buffer)
        break
      default:
        throw new ExtractionError("This resource file type cannot be read for chat")
    }
  } catch (error) {
    if (error instanceof ExtractionError) {
      throw error
    }
    throw new ExtractionError("Could not read this resource file. Please try a different file.")
  }

  const extracted = truncateText(text)
  if (!extracted) {
    throw new ExtractionError("No readable text was found in this resource")
  }

  return extracted
}
