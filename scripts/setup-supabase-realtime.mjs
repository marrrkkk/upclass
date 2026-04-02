import "dotenv/config"

import { Client } from "pg"

const PUBLICATION_NAME = "supabase_realtime"

const REALTIME_TABLES = [
  "announcements",
  "announcement_reactions",
  "classwork",
  "submissions",
  "notifications",
  "messages",
  "channel_messages",
]

const REPLICA_IDENTITY_FULL_TABLES = [
  "announcement_reactions",
  "messages",
  "notifications",
]

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL.")
  process.exit(1)
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function ensurePublication() {
  const publication = await client.query(
    `select 1 from pg_publication where pubname = $1 limit 1`,
    [PUBLICATION_NAME],
  )

  if (publication.rowCount) {
    return
  }

  await client.query(`create publication ${PUBLICATION_NAME}`)
}

async function listExistingPublicTables() {
  const result = await client.query(
    `
      select c.relname as table_name
      from pg_publication p
      join pg_publication_rel pr on pr.prpubid = p.oid
      join pg_class c on c.oid = pr.prrelid
      join pg_namespace n on n.oid = c.relnamespace
      where p.pubname = $1
        and n.nspname = 'public'
    `,
    [PUBLICATION_NAME],
  )

  return new Set(result.rows.map((row) => row.table_name))
}

async function listExistingTables() {
  const result = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
  `)

  return new Set(result.rows.map((row) => row.table_name))
}

async function enableRealtimeForTables() {
  const existingTables = await listExistingTables()
  const publishedTables = await listExistingPublicTables()
  const addedTables = []
  const skippedTables = []

  for (const tableName of REALTIME_TABLES) {
    if (!existingTables.has(tableName)) {
      skippedTables.push(tableName)
      continue
    }

    if (publishedTables.has(tableName)) {
      continue
    }

    await client.query(`alter publication ${PUBLICATION_NAME} add table public.${tableName}`)
    addedTables.push(tableName)
  }

  return { addedTables, skippedTables }
}

async function applyReplicaIdentityFull() {
  const existingTables = await listExistingTables()
  const updatedTables = []
  const skippedTables = []

  for (const tableName of REPLICA_IDENTITY_FULL_TABLES) {
    if (!existingTables.has(tableName)) {
      skippedTables.push(tableName)
      continue
    }

    await client.query(`alter table public.${tableName} replica identity full`)
    updatedTables.push(tableName)
  }

  return { updatedTables, skippedTables }
}

async function main() {
  await client.connect()

  try {
    await ensurePublication()
    const realtimeResult = await enableRealtimeForTables()
    const replicaIdentityResult = await applyReplicaIdentityFull()

    console.log(
      JSON.stringify(
        {
          publication: PUBLICATION_NAME,
          realtimeTables: REALTIME_TABLES,
          addedToPublication: realtimeResult.addedTables,
          publicationSkippedMissing: realtimeResult.skippedTables,
          replicaIdentityFull: replicaIdentityResult.updatedTables,
          replicaIdentitySkippedMissing: replicaIdentityResult.skippedTables,
        },
        null,
        2,
      ),
    )
  } finally {
    await client.end()
  }
}

await main()
