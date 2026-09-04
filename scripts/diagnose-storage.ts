import "dotenv/config"

import { createClient } from "@supabase/supabase-js"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { resources } from "@/db/schema"
import { classifyResourceFileUrl } from "@/lib/resource-file"

function getStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables",
    )
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  })
}

async function main() {
  const supabase = getStorageClient()

  console.log("[diagnose-storage] Fetching all resources...")

  const rows = await db
    .select({
      id: resources.id,
      title: resources.title,
      fileUrl: resources.fileUrl,
      fileName: resources.fileName,
      storagePath: resources.storagePath,
      ownerId: resources.ownerId,
      createdAt: resources.createdAt,
    })
    .from(resources)

  console.log(`[diagnose-storage] Found ${rows.length} resource(s)\n`)

  let checkedCount = 0
  let missingCount = 0
  let seededCount = 0
  let appRouteCount = 0

  for (const row of rows) {
    const location = classifyResourceFileUrl(row.fileUrl)

    if (location.kind === "seeded") {
      seededCount++
      console.log(`✓ [seeded] ${row.title} - ${row.fileUrl}`)
      continue
    }

    if (location.kind === "app-route") {
      appRouteCount++
      console.warn(`⚠ [app-route] ${row.title} - ${row.fileUrl}`)
      console.warn(`  storagePath: ${row.storagePath || "(null)"}`)
      continue
    }

    // External URL - check if it's a Storage URL
    if (location.kind === "external") {
      const url = location.url
      
      // Check if it's a Supabase Storage URL
      if (url.includes("/storage/v1/object/public/resources/")) {
        checkedCount++
        
        // Extract the storage path
        const match = url.match(/\/storage\/v1\/object\/public\/resources\/(.+)$/)
        if (!match) {
          console.warn(`⚠ [external] Cannot parse storage path from URL: ${url}`)
          continue
        }

        const pathFromUrl = decodeURIComponent(match[1])

        // Verify the file exists in Storage
        const { data, error } = await supabase.storage
          .from("resources")
          .list(pathFromUrl.split("/").slice(0, -1).join("/"), {
            limit: 1000,
          })

        if (error) {
          console.error(`✗ [missing] ${row.title}`)
          console.error(`  URL: ${url}`)
          console.error(`  Storage path: ${pathFromUrl}`)
          console.error(`  Owner: ${row.ownerId}`)
          console.error(`  DB storagePath: ${row.storagePath || "(null)"}`)
          console.error(`  Error: ${error.message}`)
          missingCount++
          continue
        }

        const fileName = pathFromUrl.split("/").pop()
        const fileExists = data?.some((file) => file.name === fileName)

        if (!fileExists) {
          console.error(`✗ [missing] ${row.title}`)
          console.error(`  URL: ${url}`)
          console.error(`  Storage path: ${pathFromUrl}`)
          console.error(`  Expected filename: ${fileName}`)
          console.error(`  Owner: ${row.ownerId}`)
          console.error(`  DB storagePath: ${row.storagePath || "(null)"}`)
          console.error(`  Files in directory: ${data?.map((f) => f.name).join(", ") || "(none)"}`)
          missingCount++
        } else {
          console.log(`✓ [exists] ${row.title} - ${pathFromUrl}`)
        }
      } else {
        console.log(`✓ [external-url] ${row.title} - ${url}`)
      }
    }
  }

  console.log(`\n[diagnose-storage] Summary:`)
  console.log(`  Total resources: ${rows.length}`)
  console.log(`  Seeded files: ${seededCount}`)
  console.log(`  App route (needs repair): ${appRouteCount}`)
  console.log(`  Storage files checked: ${checkedCount}`)
  console.log(`  Missing from Storage: ${missingCount}`)

  if (missingCount > 0) {
    console.log(`\n⚠ ${missingCount} resource(s) have broken Storage references`)
    console.log(`  Options:`)
    console.log(`  1. Run 'npm run db:repair-resource-urls' to fix known issues`)
    console.log(`  2. Delete the database rows if files are permanently lost`)
    console.log(`  3. Re-upload the files using the same ownerIds and update fileUrl + storagePath`)
  }

  if (appRouteCount > 0) {
    console.log(`\n⚠ ${appRouteCount} resource(s) use app-route URLs`)
    console.log(`  Run 'npm run db:repair-resource-urls' to attempt automatic repair`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[diagnose-storage] Failed:", error)
    process.exit(1)
  })
