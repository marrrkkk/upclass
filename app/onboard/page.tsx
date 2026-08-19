import { redirect } from "next/navigation"

type OnboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

/** Compatibility redirect for legacy `/onboard` links. */
export default async function OnboardPage({ searchParams }: OnboardPageProps) {
  const params = searchParams ? await searchParams : {}
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value)
    else if (Array.isArray(value) && value[0]) query.set(key, value[0])
  }

  const suffix = query.toString()
  redirect(suffix ? `/org/setup?${suffix}` : "/org/setup?scope=account")
}
