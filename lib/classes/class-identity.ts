/**
 * Format a class's structured identity into a human-readable string.
 * Returns "Title - Grade - Section" format, with fallback to legacy category if structured fields are missing.
 */
export function formatClassIdentity(data: {
  title: string
  gradeLevel?: string | null
  customGrade?: string | null
  section?: string | null
  category?: string | null
}): string {
  const parts: string[] = [data.title]

  // Add grade level or custom grade
  if (data.gradeLevel) {
    if (data.gradeLevel === "other" && data.customGrade) {
      parts.push(data.customGrade)
    } else {
      // Convert enum to human-readable format: "grade_8" → "Grade 8"
      const gradeLabel = formatGradeLevel(data.gradeLevel)
      if (gradeLabel) {
        parts.push(gradeLabel)
      }
    }
  }

  // Add section
  if (data.section) {
    parts.push(data.section)
  }

  return parts.join(" - ")
}

/**
 * Format a grade level enum value into a human-readable label.
 */
export function formatGradeLevel(gradeLevel: string): string {
  const gradeLevelMap: Record<string, string> = {
    kindergarten: "Kindergarten",
    grade_1: "Grade 1",
    grade_2: "Grade 2",
    grade_3: "Grade 3",
    grade_4: "Grade 4",
    grade_5: "Grade 5",
    grade_6: "Grade 6",
    grade_7: "Grade 7",
    grade_8: "Grade 8",
    grade_9: "Grade 9",
    grade_10: "Grade 10",
    grade_11: "Grade 11",
    grade_12: "Grade 12",
    college: "College",
    other: "Other",
  }

  return gradeLevelMap[gradeLevel] || gradeLevel
}

/**
 * Get a fallback display for classes without structured grade data.
 * Shows "Grade not set" for missing grades, useful during migration.
 */
export function getGradeLevelFallback(data: {
  gradeLevel?: string | null
  customGrade?: string | null
  category?: string | null
}): string {
  if (data.gradeLevel) {
    if (data.gradeLevel === "other" && data.customGrade) {
      return data.customGrade
    }
    return formatGradeLevel(data.gradeLevel)
  }

  // Legacy fallback during migration
  if (data.category) {
    return data.category
  }

  return "Grade not set"
}
