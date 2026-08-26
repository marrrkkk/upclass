import "dotenv/config"

import { stat } from "node:fs/promises"
import path from "node:path"

import { eq } from "drizzle-orm"

import { db } from "@/db"
import { resources } from "@/db/schema"
import {
  classifyResourceFileUrl,
  suggestRepairedResourceUrl,
} from "@/lib/resource-file"

const SEEDED_RESOURCES_DIR = path.join(process.cwd(), "public", "seeded-resources")

async function seededFileExists(fileName: string): Promise<boolean> {
  try {
    const resolvedDir = path.resolve(SEEDED_RESOURCES_DIR)
    const filePath = path.resolve(resolvedDir, fileName)
    if (!filePath.startsWith(`${resolvedDir}${path.sep}`)) return false
    const fileStat = await stat(filePath)
    return fileStat.isFile()
  } catch {
    return false
  }
}

async function main() {
  const rows = await db
    .select({
      id: resources.id,
      title: resources.title,
      fileUrl: resources.fileUrl,
      fileName: resources.fileName,
      fileType: resources.fileType,
      storagePath: resources.storagePath,
    })
    .from(resources)

  const broken = rows.filter(
    (row) => classifyResourceFileUrl(row.fileUrl).kind === "app-route",
  )

  console.log(
    `[repair-resource-urls] Scanned ${rows.length} resource row(s); ${broken.length} point at an app route.`,
  )

  let repaired = 0
  for (const row of broken) {
    const candidate = suggestRepairedResourceUrl({
      fileUrl: row.fileUrl,
      storagePath: row.storagePath,
      fileName: row.fileName,
    })

    if (!candidate) {
      console.warn(
        `[repair-resource-urls] No repair available for "${row.title}" (${row.id}); stored url: ${row.fileUrl}`,
      )
      continue
    }

    if (candidate.startsWith("/seeded-resources/")) {
      const fileName = decodeURIComponent(candidate.replace("/seeded-resources/", ""))
      if (!(await seededFileExists(fileName))) {
        console.warn(
          `[repair-resource-urls] Seeded candidate missing on disk for "${row.title}" (${row.id}): ${candidate}`,
        )
        continue
      }
    }

    await db
      .update(resources)
      .set({ fileUrl: candidate })
      .where(eq(resources.id, row.id))

    repaired += 1
    console.log(`[repair-resource-urls] ${row.id}: ${row.fileUrl} -> ${candidate}`)
  }

  console.log(`[repair-resource-urls] Repaired ${repaired} row(s).`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[repair-resource-urls] Failed:", error)
    process.exit(1)
  })
