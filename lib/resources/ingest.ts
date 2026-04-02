import "server-only"

import { createHash } from "node:crypto"

import { eq } from "drizzle-orm"

import { db } from "@/db"
import { resourceDocumentChunks, resourceDocuments, resources } from "@/db/schema"
import { chunkResourceBlocks } from "@/lib/resources/chunking"
import { embedTexts, getOpenRouterEmbeddingModel } from "@/lib/resources/openrouter"
import { parseResourceDocument, UnsupportedResourceTypeError } from "@/lib/resources/parser"
import { downloadStorageObject } from "@/lib/storage/server"

type IngestionResult = {
  status: "ready" | "failed" | "unsupported"
  message?: string
}

async function ensureDocumentRow(
  resourceId: string,
  classId: string,
  userId: string,
  documentId?: string,
) {
  const nextDocumentId = documentId ?? crypto.randomUUID()

  await db
    .insert(resourceDocuments)
    .values({
      id: nextDocumentId,
      resourceId,
      classId,
      createdBy: userId,
      status: "processing",
      chunkCount: 0,
      pageCount: 0,
      extractedText: "",
      lastError: null,
      checksum: null,
      parser: null,
      embeddingModel: null,
      embeddingDimensions: null,
      ingestedAt: null,
    })
    .onConflictDoUpdate({
      target: resourceDocuments.resourceId,
      set: {
        classId,
        status: "processing",
        lastError: null,
        updatedAt: new Date(),
      },
    })

  const rows = await db
    .select({
      id: resourceDocuments.id,
      checksum: resourceDocuments.checksum,
      status: resourceDocuments.status,
      chunkCount: resourceDocuments.chunkCount,
      embeddingModel: resourceDocuments.embeddingModel,
    })
    .from(resourceDocuments)
    .where(eq(resourceDocuments.resourceId, resourceId))
    .limit(1)

  return rows[0]
}

async function setDocumentFailure(
  resourceId: string,
  status: "failed" | "unsupported",
  message: string,
) {
  await db
    .update(resourceDocuments)
    .set({
      status,
      lastError: message,
      updatedAt: new Date(),
    })
    .where(eq(resourceDocuments.resourceId, resourceId))
}

export async function ingestResourceDocument(resourceId: string, userId: string): Promise<IngestionResult> {
  const rows = await db
    .select({
      id: resources.id,
      classId: resources.classId,
      fileName: resources.fileName,
      mimeType: resources.mimeType,
      storageBucket: resources.storageBucket,
      storagePath: resources.storagePath,
    })
    .from(resources)
    .where(eq(resources.id, resourceId))
    .limit(1)

  const resource = rows[0]
  if (!resource) {
    throw new Error("Resource not found")
  }

  if (!resource.storageBucket || !resource.storagePath) {
    await ensureDocumentRow(resource.id, resource.classId, userId)
    await setDocumentFailure(resource.id, "failed", "Resource storage metadata is missing.")
    return {
      status: "failed",
      message: "Resource storage metadata is missing.",
    }
  }

  let existingDocument = await ensureDocumentRow(resource.id, resource.classId, userId)

  try {
    const arrayBuffer = await downloadStorageObject(resource.storageBucket, resource.storagePath)
    const checksum = createHash("sha256")
      .update(Buffer.from(arrayBuffer))
      .digest("hex")
    const embeddingModel = getOpenRouterEmbeddingModel()

    if (
      existingDocument?.checksum === checksum &&
      existingDocument.status === "ready" &&
      existingDocument.chunkCount > 0 &&
      existingDocument.embeddingModel === embeddingModel
    ) {
      return { status: "ready" }
    }

    const parsedDocument = await parseResourceDocument({
      fileName: resource.fileName,
      mimeType: resource.mimeType,
      arrayBuffer,
    })
    const chunks = chunkResourceBlocks(parsedDocument.blocks)

    if (!parsedDocument.text.trim() || chunks.length === 0) {
      await setDocumentFailure(resource.id, "failed", "The uploaded file does not contain extractable text.")
      return {
        status: "failed",
        message: "The uploaded file does not contain extractable text.",
      }
    }

    const embeddings: number[][] = []
    const batchSize = 20
    for (let index = 0; index < chunks.length; index += batchSize) {
      const batch = chunks.slice(index, index + batchSize)
      const batchEmbeddings = await embedTexts(batch.map((chunk) => chunk.text))
      embeddings.push(...batchEmbeddings)
    }

    existingDocument = await ensureDocumentRow(
      resource.id,
      resource.classId,
      userId,
      existingDocument?.id,
    )

    await db.transaction(async (tx) => {
      await tx
        .update(resourceDocuments)
        .set({
          classId: resource.classId,
          status: "ready",
          parser: parsedDocument.parser,
          embeddingModel,
          embeddingDimensions: embeddings[0]?.length ?? 0,
          checksum,
          extractedText: parsedDocument.text,
          chunkCount: chunks.length,
          pageCount: parsedDocument.pageCount,
          lastError: null,
          ingestedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(resourceDocuments.resourceId, resource.id))

      await tx
        .delete(resourceDocumentChunks)
        .where(eq(resourceDocumentChunks.documentId, existingDocument.id))

      await tx.insert(resourceDocumentChunks).values(
        chunks.map((chunk, index) => ({
          id: crypto.randomUUID(),
          documentId: existingDocument.id,
          classId: resource.classId,
          resourceId: resource.id,
          chunkText: chunk.text,
          chunkIndex: chunk.chunkIndex,
          pageNumber: chunk.pageNumber,
          sectionLabel: chunk.sectionLabel,
          tokenCount: chunk.tokenCount,
          embedding: embeddings[index] ?? [],
        })),
      )
    })

    return { status: "ready" }
  } catch (error) {
    const message =
      error instanceof UnsupportedResourceTypeError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Failed to ingest resource"

    await setDocumentFailure(
      resource.id,
      error instanceof UnsupportedResourceTypeError ? "unsupported" : "failed",
      message,
    )

    return {
      status: error instanceof UnsupportedResourceTypeError ? "unsupported" : "failed",
      message,
    }
  }
}
