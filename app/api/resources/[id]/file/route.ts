import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import path from "node:path"
import { Readable } from "node:stream"

import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { resources } from "@/db/schema"
import {
  classifyResourceFileUrl,
  inlineContentDisposition,
  resourceContentType,
  suggestRepairedResourceUrl,
  type ResourceFileLocation,
} from "@/lib/resource-file"

const SEEDED_RESOURCES_DIR = path.join(process.cwd(), "public", "seeded-resources")

function notFound(): NextResponse {
  return new NextResponse("Not found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}

async function serveSeededFile(
  fileName: string,
  resourceFileName: string,
  fileType: string | null,
): Promise<NextResponse> {
  const resolvedDir = path.resolve(SEEDED_RESOURCES_DIR)
  const filePath = path.resolve(resolvedDir, fileName)
  if (!filePath.startsWith(`${resolvedDir}${path.sep}`)) return notFound()

  const fileStat = await stat(filePath).catch(() => null)
  if (!fileStat?.isFile()) return notFound()

  const stream = Readable.toWeb(
    createReadStream(filePath),
  ) as unknown as ReadableStream<Uint8Array>

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": resourceContentType(fileType),
      "Content-Length": String(fileStat.size),
      "Content-Disposition": inlineContentDisposition(resourceFileName),
      "Cache-Control": "public, max-age=300",
    },
  })
}

async function serveExternal(url: string): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 302,
    headers: {
      Location: url,
      "Cache-Control": "no-store",
    },
  })
}

async function serveResolvedLocation(
  location: ResourceFileLocation,
  fileName: string,
  fileType: string | null,
): Promise<NextResponse> {
  switch (location.kind) {
    case "external":
      return serveExternal(location.url)
    case "seeded":
      return serveSeededFile(location.fileName, fileName, fileType)
    case "app-route":
      return notFound()
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params

  const [resource] = await db
    .select({
      id: resources.id,
      fileUrl: resources.fileUrl,
      fileName: resources.fileName,
      fileType: resources.fileType,
      storagePath: resources.storagePath,
    })
    .from(resources)
    .where(eq(resources.id, id))
    .limit(1)

  if (!resource) return notFound()

  const location = classifyResourceFileUrl(resource.fileUrl)

  if (location.kind === "app-route") {
    const repaired = suggestRepairedResourceUrl({
      fileUrl: resource.fileUrl,
      storagePath: resource.storagePath,
      fileName: resource.fileName,
    })
    if (!repaired) return notFound()
    return serveResolvedLocation(classifyResourceFileUrl(repaired), resource.fileName, resource.fileType)
  }

  return serveResolvedLocation(location, resource.fileName, resource.fileType)
}
