import { describe, expect, test } from "vitest"

import {
  createClassSchema,
  createResourceSchema,
  gradeLevelEnum,
  resourceTypeEnum,
  updateClassSchema,
  updateResourceSchema,
} from "@/lib/validation/actions"

describe("grade level validation", () => {
  test("accepts all valid grade levels", () => {
    const validLevels = [
      "kindergarten",
      "grade_1",
      "grade_2",
      "grade_3",
      "grade_4",
      "grade_5",
      "grade_6",
      "grade_7",
      "grade_8",
      "grade_9",
      "grade_10",
      "grade_11",
      "grade_12",
      "college",
      "other",
    ]

    for (const level of validLevels) {
      const result = gradeLevelEnum.safeParse(level)
      expect(result.success).toBe(true)
    }
  })

  test("rejects invalid grade levels", () => {
    const result = gradeLevelEnum.safeParse("invalid_grade")
    expect(result.success).toBe(false)
  })
})

describe("resource type validation", () => {
  test("accepts all valid resource types", () => {
    const validTypes = [
      "notes",
      "slides",
      "worksheet",
      "reading",
      "reference",
      "template",
      "other",
    ]

    for (const type of validTypes) {
      const result = resourceTypeEnum.safeParse(type)
      expect(result.success).toBe(true)
    }
  })

  test("rejects invalid resource types", () => {
    const result = resourceTypeEnum.safeParse("invalid_type")
    expect(result.success).toBe(false)
  })
})

describe("create class schema", () => {
  test("accepts valid class data with required fields", () => {
    const result = createClassSchema.safeParse({
      title: "Mathematics",
      gradeLevel: "grade_8",
      color: "#0369a1",
    })

    expect(result.success).toBe(true)
  })

  test("trims and validates title", () => {
    const result = createClassSchema.safeParse({
      title: "  Math  ",
      gradeLevel: "grade_8",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe("Math")
    }
  })

  test("requires title to be at least 2 characters", () => {
    const result = createClassSchema.safeParse({
      title: "M",
      gradeLevel: "grade_8",
    })

    expect(result.success).toBe(false)
  })

  test("requires title to be 80 characters or fewer", () => {
    const longTitle = "A".repeat(81)
    const result = createClassSchema.safeParse({
      title: longTitle,
      gradeLevel: "grade_8",
    })

    expect(result.success).toBe(false)
  })

  test("requires gradeLevel", () => {
    const result = createClassSchema.safeParse({
      title: "Mathematics",
    })

    expect(result.success).toBe(false)
  })

  test("accepts optional section", () => {
    const result = createClassSchema.safeParse({
      title: "Mathematics",
      gradeLevel: "grade_8",
      section: "Rizal",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.section).toBe("Rizal")
    }
  })

  test("limits section to 40 characters", () => {
    const longSection = "A".repeat(41)
    const result = createClassSchema.safeParse({
      title: "Mathematics",
      gradeLevel: "grade_8",
      section: longSection,
    })

    expect(result.success).toBe(false)
  })

  test("requires custom grade when gradeLevel is other", () => {
    const result = createClassSchema.safeParse({
      title: "Mathematics",
      gradeLevel: "other",
    })

    expect(result.success).toBe(false)
  })

  test("accepts custom grade when gradeLevel is other", () => {
    const result = createClassSchema.safeParse({
      title: "Mathematics",
      gradeLevel: "other",
      customGrade: "Year 1 College",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.customGrade).toBe("Year 1 College")
    }
  })

  test("requires custom grade to be at least 2 characters when other", () => {
    const result = createClassSchema.safeParse({
      title: "Mathematics",
      gradeLevel: "other",
      customGrade: "A",
    })

    expect(result.success).toBe(false)
  })

  test("limits custom grade to 40 characters", () => {
    const longGrade = "A".repeat(41)
    const result = createClassSchema.safeParse({
      title: "Mathematics",
      gradeLevel: "other",
      customGrade: longGrade,
    })

    expect(result.success).toBe(false)
  })

  test("ignores custom grade when gradeLevel is not other", () => {
    const result = createClassSchema.safeParse({
      title: "Mathematics",
      gradeLevel: "grade_8",
      customGrade: "Should be ignored",
    })

    expect(result.success).toBe(true)
  })

  test("accepts optional description up to 500 characters", () => {
    const description = "A".repeat(500)
    const result = createClassSchema.safeParse({
      title: "Mathematics",
      gradeLevel: "grade_8",
      description,
    })

    expect(result.success).toBe(true)
  })

  test("rejects description over 500 characters", () => {
    const description = "A".repeat(501)
    const result = createClassSchema.safeParse({
      title: "Mathematics",
      gradeLevel: "grade_8",
      description,
    })

    expect(result.success).toBe(false)
  })

  test("accepts optional schedule up to 120 characters", () => {
    const schedule = "A".repeat(120)
    const result = createClassSchema.safeParse({
      title: "Mathematics",
      gradeLevel: "grade_8",
      schedule,
    })

    expect(result.success).toBe(true)
  })

  test("rejects schedule over 120 characters", () => {
    const schedule = "A".repeat(121)
    const result = createClassSchema.safeParse({
      title: "Mathematics",
      gradeLevel: "grade_8",
      schedule,
    })

    expect(result.success).toBe(false)
  })
})

describe("update class schema", () => {
  test("uses the same validation as create class", () => {
    expect(updateClassSchema).toBe(createClassSchema)
  })
})

describe("create resource schema", () => {
  test("accepts valid resource data with required fields", () => {
    const result = createResourceSchema.safeParse({
      title: "Chapter 3 Lecture Slides",
      resourceType: "slides",
      fileUrl: "https://example.com/file.pdf",
      fileName: "chapter-3.pdf",
      fileType: "pdf",
    })

    expect(result.success).toBe(true)
  })

  test("trims and validates title", () => {
    const result = createResourceSchema.safeParse({
      title: "  Chapter 3  ",
      resourceType: "slides",
      fileUrl: "https://example.com/file.pdf",
      fileName: "chapter-3.pdf",
      fileType: "pdf",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe("Chapter 3")
    }
  })

  test("requires title to be at least 2 characters", () => {
    const result = createResourceSchema.safeParse({
      title: "A",
      resourceType: "slides",
      fileUrl: "https://example.com/file.pdf",
      fileName: "file.pdf",
      fileType: "pdf",
    })

    expect(result.success).toBe(false)
  })

  test("requires title to be 160 characters or fewer", () => {
    const longTitle = "A".repeat(161)
    const result = createResourceSchema.safeParse({
      title: longTitle,
      resourceType: "slides",
      fileUrl: "https://example.com/file.pdf",
      fileName: "file.pdf",
      fileType: "pdf",
    })

    expect(result.success).toBe(false)
  })

  test("requires resourceType", () => {
    const result = createResourceSchema.safeParse({
      title: "Chapter 3",
      fileUrl: "https://example.com/file.pdf",
      fileName: "file.pdf",
      fileType: "pdf",
    })

    expect(result.success).toBe(false)
  })

  test("accepts optional classId", () => {
    const result = createResourceSchema.safeParse({
      title: "Chapter 3",
      resourceType: "slides",
      classId: "class-123",
      fileUrl: "https://example.com/file.pdf",
      fileName: "file.pdf",
      fileType: "pdf",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.classId).toBe("class-123")
    }
  })

  test("accepts empty classId as absent", () => {
    const result = createResourceSchema.safeParse({
      title: "Chapter 3",
      resourceType: "slides",
      classId: "",
      fileUrl: "https://example.com/file.pdf",
      fileName: "file.pdf",
      fileType: "pdf",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.classId).toBeUndefined()
    }
  })

  test("accepts optional description up to 500 characters", () => {
    const description = "A".repeat(500)
    const result = createResourceSchema.safeParse({
      title: "Chapter 3",
      resourceType: "slides",
      description,
      fileUrl: "https://example.com/file.pdf",
      fileName: "file.pdf",
      fileType: "pdf",
    })

    expect(result.success).toBe(true)
  })

  test("rejects description over 500 characters", () => {
    const description = "A".repeat(501)
    const result = createResourceSchema.safeParse({
      title: "Chapter 3",
      resourceType: "slides",
      description,
      fileUrl: "https://example.com/file.pdf",
      fileName: "file.pdf",
      fileType: "pdf",
    })

    expect(result.success).toBe(false)
  })

  test("requires fileUrl", () => {
    const result = createResourceSchema.safeParse({
      title: "Chapter 3",
      resourceType: "slides",
      fileName: "file.pdf",
      fileType: "pdf",
    })

    expect(result.success).toBe(false)
  })

  test("requires fileName", () => {
    const result = createResourceSchema.safeParse({
      title: "Chapter 3",
      resourceType: "slides",
      fileUrl: "https://example.com/file.pdf",
      fileType: "pdf",
    })

    expect(result.success).toBe(false)
  })

  test("requires fileType", () => {
    const result = createResourceSchema.safeParse({
      title: "Chapter 3",
      resourceType: "slides",
      fileUrl: "https://example.com/file.pdf",
      fileName: "file.pdf",
    })

    expect(result.success).toBe(false)
  })

  test("accepts optional fileSize", () => {
    const result = createResourceSchema.safeParse({
      title: "Chapter 3",
      resourceType: "slides",
      fileUrl: "https://example.com/file.pdf",
      fileName: "file.pdf",
      fileType: "pdf",
      fileSize: "1024",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.fileSize).toBe("1024")
    }
  })

  test("accepts optional storagePath", () => {
    const result = createResourceSchema.safeParse({
      title: "Chapter 3",
      resourceType: "slides",
      fileUrl: "https://example.com/file.pdf",
      fileName: "file.pdf",
      fileType: "pdf",
      storagePath: "user-123/file.pdf",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.storagePath).toBe("user-123/file.pdf")
    }
  })

  test("rejects storagePath with leading slash", () => {
    const result = createResourceSchema.safeParse({
      title: "Chapter 3",
      resourceType: "slides",
      fileUrl: "https://example.com/file.pdf",
      fileName: "file.pdf",
      fileType: "pdf",
      storagePath: "/user-123/file.pdf",
    })

    expect(result.success).toBe(false)
  })
})

describe("update resource schema", () => {
  test("accepts valid update data", () => {
    const result = updateResourceSchema.safeParse({
      id: "resource-123",
      title: "Updated Title",
      resourceType: "notes",
    })

    expect(result.success).toBe(true)
  })

  test("requires resource id", () => {
    const result = updateResourceSchema.safeParse({
      title: "Updated Title",
      resourceType: "notes",
    })

    expect(result.success).toBe(false)
  })

  test("applies same title validation as create", () => {
    const result = updateResourceSchema.safeParse({
      id: "resource-123",
      title: "A",
      resourceType: "notes",
    })

    expect(result.success).toBe(false)
  })

  test("accepts optional classId", () => {
    const result = updateResourceSchema.safeParse({
      id: "resource-123",
      title: "Updated Title",
      resourceType: "notes",
      classId: "class-456",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.classId).toBe("class-456")
    }
  })
})
