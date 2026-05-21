/**
 * Organization slug generation utilities.
 *
 * Slugs are URL-safe identifiers derived from organization names.
 * They are lowercase, hyphen-separated, and limited to 120 characters.
 */

const MAX_SLUG_LENGTH = 120;

/**
 * Generate a URL-safe slug from an organization name.
 *
 * Rules:
 * 1. Lowercase the name
 * 2. Replace spaces with hyphens
 * 3. Remove all characters not matching [a-z0-9\-]
 * 4. Truncate to 120 characters
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, MAX_SLUG_LENGTH);
}

/**
 * Generate a unique slug by appending a numeric suffix if the base slug
 * already exists in the provided list.
 *
 * If "my-org" exists, tries "my-org-1", "my-org-2", etc. until a unique
 * slug is found.
 */
export function generateUniqueSlug(
  name: string,
  existingSlugs: string[]
): string {
  const baseSlug = generateSlug(name);

  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  let counter = 1;
  while (existingSlugs.includes(`${baseSlug}-${counter}`)) {
    counter++;
  }

  return `${baseSlug}-${counter}`;
}
