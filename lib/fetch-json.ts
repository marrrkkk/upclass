export async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    cache: "no-store",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    let errorMessage = `${response.status} ${response.statusText}`

    try {
      const payload = (await response.json()) as { error?: string }
      if (payload.error) {
        errorMessage = payload.error
      }
    } catch {
      // Ignore JSON parsing failures for non-JSON error responses.
    }

    throw new Error(errorMessage)
  }

  return (await response.json()) as T
}
