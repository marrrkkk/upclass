import { spawnSync } from "node:child_process"

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  })

  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status)
  }

  if (result.error) {
    throw result.error
  }
}

run("npx", ["drizzle-kit", "push", "--config", "drizzle.config.ts"])
run("node", ["scripts/setup-supabase-realtime.mjs"])
