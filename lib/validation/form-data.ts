import type { ZodType } from "zod"

function formDataToRecord(formData: FormData) {
  const record: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {}

  for (const [key, value] of formData.entries()) {
    const existing = record[key]

    if (existing === undefined) {
      record[key] = value
      continue
    }

    if (Array.isArray(existing)) {
      existing.push(value)
      continue
    }

    record[key] = [existing, value]
  }

  return record
}

export function parseFormData<T>(schema: ZodType<T>, formData: FormData) {
  return schema.safeParse(formDataToRecord(formData))
}
