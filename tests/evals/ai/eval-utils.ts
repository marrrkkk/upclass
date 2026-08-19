/**
 * Minimal scored-eval harness for model-free pipeline evals.
 *
 * Evals in this directory run against real modules (no live model calls)
 * and report a per-suite pass rate so regressions in pipeline behavior are
 * visible in CI. Each check is a boolean assertion; the suite fails when
 * any check fails.
 */

export type EvalCheck = {
  name: string
  pass: boolean
  detail?: string
}

export function evaluate(name: string, checks: EvalCheck[]) {
  const passed = checks.filter((check) => check.pass).length
  const rate = checks.length === 0 ? 1 : passed / checks.length
  const summary = `${name}: ${passed}/${checks.length} checks passed (${Math.round(rate * 100)}%)`
  const failed = checks.filter((check) => !check.pass)

  for (const check of failed) {
    console.error(`  ✗ ${check.name}${check.detail ? ` — ${check.detail}` : ""}`)
  }

  if (failed.length > 0) {
    throw new Error(`${summary}\n  ${failed.map((check) => `✗ ${check.name}`).join("\n  ")}`)
  }

  console.log(`  ✓ ${summary}`)
  return { passed, total: checks.length }
}

export function check(
  name: string,
  pass: boolean,
  detail?: string,
): EvalCheck {
  return { name, pass, detail }
}