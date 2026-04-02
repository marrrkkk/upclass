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

run("npm", ["run", "lint"])
run("npm", ["run", "type-check"])
run("npm", ["run", "test"])

if (process.env.DATABASE_URL) {
  run("npm", ["run", "db:migrate"])
} else {
  console.log("Skipping db:migrate because DATABASE_URL is not set")
}

run("npx", ["next", "build", "--webpack"])
