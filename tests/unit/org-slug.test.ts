import { describe, it, expect } from "vitest";
import { generateSlug, generateUniqueSlug } from "@/lib/org-slug";

describe("generateSlug", () => {
  it("lowercases the name", () => {
    expect(generateSlug("My Organization")).toBe("my-organization");
  });

  it("replaces spaces with hyphens", () => {
    expect(generateSlug("hello world")).toBe("hello-world");
  });

  it("removes disallowed characters", () => {
    expect(generateSlug("Org & Co's!")).toBe("org--cos");
  });

  it("collapses multiple consecutive spaces into a single hyphen", () => {
    expect(generateSlug("a   b")).toBe("a-b");
  });

  it("truncates to 120 characters", () => {
    const longName = "a".repeat(200);
    expect(generateSlug(longName).length).toBe(120);
  });

  it("returns empty string for empty input", () => {
    expect(generateSlug("")).toBe("");
  });

  it("handles names with only disallowed chars", () => {
    expect(generateSlug("!!!")).toBe("");
  });

  it("preserves numbers", () => {
    expect(generateSlug("Org 123")).toBe("org-123");
  });
});

describe("generateUniqueSlug", () => {
  it("returns base slug when no conflicts", () => {
    expect(generateUniqueSlug("My Org", [])).toBe("my-org");
  });

  it("appends -1 when base slug exists", () => {
    expect(generateUniqueSlug("My Org", ["my-org"])).toBe("my-org-1");
  });

  it("appends -2 when base and -1 exist", () => {
    expect(generateUniqueSlug("My Org", ["my-org", "my-org-1"])).toBe(
      "my-org-2"
    );
  });

  it("finds first available suffix", () => {
    const existing = ["my-org", "my-org-1", "my-org-2", "my-org-3"];
    expect(generateUniqueSlug("My Org", existing)).toBe("my-org-4");
  });

  it("does not conflict with unrelated slugs", () => {
    expect(generateUniqueSlug("My Org", ["other-org"])).toBe("my-org");
  });
});
