import "dotenv/config"

import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { eq, inArray } from "drizzle-orm"
import * as XLSX from "xlsx"

import { db } from "@/db"
import {
  classMembership,
  classes,
  gradeLevel,
  orgMembership,
  organizations,
  resourceFileType,
  resourceType,
  resources,
  user,
} from "@/db/schema"
import { ensureResourceChunks } from "@/lib/resource-chunks"

type GradeLevelValue = (typeof gradeLevel.enumValues)[number]
type ResourceTypeValue = (typeof resourceType.enumValues)[number]
type FileTypeValue = (typeof resourceFileType.enumValues)[number]

const OWNER_EMAIL = "marklouie.dev@gmail.com"
const OWNER_NAME = "Mark Louie"

const ORG_SLUG = "san-isidro-nhs"
const ORG = {
  name: "San Isidro National High School",
  description: "Seeded demo organization with classes, students, and learning resources.",
}

const OUTPUT_DIR = path.join(process.cwd(), "public", "seeded-resources")

const STUDENT_NAMES = [
  "Ariana Santos",
  "Miguel Reyes",
  "Sofia Garcia",
  "Lucas Mendoza",
  "Isabella Cruz",
  "Gabriel Flores",
  "Chloe Navarro",
  "Ethan Ramos",
  "Liwayway Domingo",
  "Rafael Villanueva",
  "Camille Deguzman",
  "Joshua Delacruz",
  "Mariel Aquino",
  "Paolo Mercado",
  "Bianca Lim",
  "Nathan Castillo",
  "Andrea Salazar",
  "Kevin Bautista",
  "Trisha Ocampo",
  "Daniel Marquez",
  "Jasmine Panganiban",
  "Marco Torres",
  "Angela Fuentes",
  "Christian Yap",
  "Nicole Sarmiento",
  "Francis Uy",
  "Karla Montoya",
  "Dennis Alonzo",
  "Precious Villaflor",
  "Simon Escobar",
]

const CLASS_SEEDS = [
  {
    key: "math8-narra",
    code: "MATH8-N",
    title: "Mathematics 8",
    description: "First quarter algebra: patterns, linear equations, and problem solving.",
    gradeLevel: "grade_8",
    section: "Narra",
    color: "#0e6b52",
    schedule: "Mon, Wed, Fri 7:30 AM",
    roster: range(0, 15),
  },
  {
    key: "sci8-narra",
    code: "SCI8-N",
    title: "Science 8",
    description: "Life science focus: cells, digestion, and the periodic table.",
    gradeLevel: "grade_8",
    section: "Narra",
    color: "#06b6d4",
    schedule: "Tue, Thu 9:45 AM",
    roster: range(0, 15),
  },
  {
    key: "ap8-narra",
    code: "AP8-N",
    title: "Araling Panlipunan 8",
    description: "Philippine history from pre-colonial times to the Spanish period.",
    gradeLevel: "grade_8",
    section: "Narra",
    color: "#f43f5e",
    schedule: "Wed, Fri 10:30 AM",
    roster: range(0, 13),
  },
  {
    key: "eng8-molave",
    code: "ENG8-M",
    title: "English 8",
    description: "Academic writing, essay structure, and peer feedback workshops.",
    gradeLevel: "grade_8",
    section: "Molave",
    color: "#8b5cf6",
    schedule: "Mon, Thu 1:00 PM",
    roster: range(16, 29),
  },
  {
    key: "fil8-molave",
    code: "FIL8-M",
    title: "Filipino 8",
    description: "Pananandungan, gramatika, at pagbasa nang mapanuri.",
    gradeLevel: "grade_8",
    section: "Molave",
    color: "#6366f1",
    schedule: "Tue, Fri 2:30 PM",
    roster: range(16, 27),
  },
  {
    key: "ict9-acacia",
    code: "ICT9-A",
    title: "ICT 9",
    description: "Computer systems servicing, web basics, and digital citizenship.",
    gradeLevel: "grade_9",
    section: "Acacia",
    color: "#ef4444",
    schedule: "Wed 7:30 AM - 9:30 AM",
    roster: [4, 5, 6, 7, 8, 9, 20, 21, 22, 23, 24, 25],
  },
  {
    key: "res10-acacia",
    code: "RES10-A",
    title: "Research 10",
    description: "Practical research design, APA citation, and paper writing.",
    gradeLevel: "grade_10",
    section: "Acacia",
    color: "#06b6d4",
    schedule: "Thu 3:30 PM",
    roster: [0, 1, 2, 3, 16, 17, 18, 19, 26, 27, 28, 29],
  },
] satisfies ClassSeed[]

type ClassSeed = {
  key: string
  code: string
  title: string
  description: string
  gradeLevel: GradeLevelValue
  section: string
  color: string
  schedule: string
  roster: number[]
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i)
}

function slugifyEmail(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z ]/g, "").split(" ").join(".")}@upclass.demo`
}

function studentBio(index: number): string {
  if (index <= 15) return "Grade 8 - Narra"
  return "Grade 8 - Molave"
}

/* ---------------------------------------------------------------------------
 * Minimal PDF writer: builds valid multi-page documents from styled lines.
 * ------------------------------------------------------------------------- */

type FontId = "F1" | "F2"

type PdfLine = {
  text: string
  font?: FontId
  size?: number
  gapBefore?: number
  pageBreak?: boolean
  wrapWidth?: number
}

const LETTER = { width: 612, height: 792, marginX: 64, top: 72, bottom: 72 }
const SLIDE = { width: 792, height: 612, marginX: 56, top: 60, bottom: 52 }

function toAscii(input: string): string {
  return input
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\x20-\x7E]/g, "")
}

function escapePdfText(text: string): string {
  return toAscii(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
}

function wrapText(text: string, maxChars: number): string[] {
  const words = toAscii(text).split(/\s+/).filter(Boolean)
  const rows: string[] = []
  let current = ""
  for (const word of words) {
    if (!current.length) {
      current = word
    } else if (`${current} ${word}`.length <= maxChars) {
      current = `${current} ${word}`
    } else {
      rows.push(current)
      current = word
    }
  }
  if (current.length) rows.push(current)
  return rows.length ? rows : [""]
}

function pushWrapped(
  lines: PdfLine[],
  text: string,
  options: { font?: FontId; size?: number; gapBefore?: number; wrapWidth?: number },
): void {
  const rows = wrapText(text, options.wrapWidth ?? 88)
  rows.forEach((row, index) => {
    lines.push({
      text: row,
      font: options.font ?? "F1",
      size: options.size ?? 11,
      gapBefore: index === 0 ? (options.gapBefore ?? 0) : 0,
      wrapWidth: options.wrapWidth,
    })
  })
}

function paginateDoc(lines: PdfLine[]): string[][] {
  const pages: string[][] = []
  let ops: string[] = []
  let y = LETTER.height - LETTER.top

  const flush = () => {
    if (ops.length) pages.push(ops)
    ops = []
    y = LETTER.height - LETTER.top
  }

  for (const line of lines) {
    if (line.pageBreak) {
      flush()
      continue
    }
    const size = line.size ?? 11
    const lineHeight = size * 1.42
    y -= line.gapBefore ?? 0
    if (y - lineHeight < LETTER.bottom) flush()
    y -= lineHeight
    if (!line.text) continue
    ops.push(
      `BT /${line.font ?? "F1"} ${size} Tf 1 0 0 1 ${LETTER.marginX} ${y.toFixed(2)} Tm (${escapePdfText(line.text)}) Tj ET`,
    )
  }
  flush()
  if (!pages.length) pages.push([])
  return pages
}

function assemblePdf(pagesOps: string[][], width: number, height: number): Buffer {
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  ]
  const kids = pagesOps.map((_, i) => `${5 + i * 2} 0 R`).join(" ")
  objects[1] = `<< /Type /Pages /Kids [${kids}] /Count ${pagesOps.length} >>`

  pagesOps.forEach((ops) => {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${objects.length + 2} 0 R >>`,
    )
    const stream = ops.join("\n")
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`)
  })

  let body = "%PDF-1.4\n"
  const offsets: number[] = []
  objects.forEach((objectBody, index) => {
    offsets.push(Buffer.byteLength(body))
    body += `${index + 1} 0 obj\n${objectBody}\nendobj\n`
  })
  const xrefOffset = Buffer.byteLength(body)
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  return Buffer.from(body, "latin1")
}

function buildDocumentPdf(lines: PdfLine[]): Buffer {
  return assemblePdf(paginateDoc(lines), LETTER.width, LETTER.height)
}

type SlidePage = { title: string; bullets: string[] }

function buildSlidePdf(deck: {
  title: string
  subtitle: string
  footer: string
  pages: SlidePage[]
}): Buffer {
  const pagesOps: string[][] = []

  pagesOps.push([
    `BT /F2 32 Tf 1 0 0 1 ${SLIDE.marginX} ${(SLIDE.height - 200).toFixed(2)} Tm (${escapePdfText(deck.title)}) Tj ET`,
    `${SLIDE.marginX} ${(SLIDE.height - 220).toFixed(2)} ${(SLIDE.width - SLIDE.marginX * 2)} 3 re f`,
    `BT /F1 16 Tf 1 0 0 1 ${SLIDE.marginX} ${(SLIDE.height - 260).toFixed(2)} Tm (${escapePdfText(deck.subtitle)}) Tj ET`,
    `BT /F1 12 Tf 1 0 0 1 ${SLIDE.marginX} 64 Tm (${escapePdfText(deck.footer)}) Tj ET`,
  ])

  for (const page of deck.pages) {
    const ops: string[] = []
    let y = SLIDE.height - SLIDE.top
    ops.push(
      `BT /F2 26 Tf 1 0 0 1 ${SLIDE.marginX} ${(y - 26).toFixed(2)} Tm (${escapePdfText(page.title)}) Tj ET`,
    )
    y -= 44
    ops.push(`${SLIDE.marginX} ${y.toFixed(2)} ${(SLIDE.width - SLIDE.marginX * 2)} 1.5 re f`)
    y -= 26
    for (const bullet of page.bullets) {
      const rows = wrapText(`-  ${bullet}`, 84)
      for (const row of rows) {
        ops.push(
          `BT /F1 15 Tf 1 0 0 1 ${SLIDE.marginX + 8} ${(y - 15).toFixed(2)} Tm (${escapePdfText(row)}) Tj ET`,
        )
        y -= 24
      }
      y -= 8
    }
    pagesOps.push(ops)
  }

  return assemblePdf(pagesOps, SLIDE.width, SLIDE.height)
}

/* ---------------------------------------------------------------------------
 * Structured document blocks shared by PDF output and aiSourceText.
 * ------------------------------------------------------------------------- */

type DocBlock =
  | { t: "h1"; text: string }
  | { t: "sub"; text: string }
  | { t: "meta"; lines: string[] }
  | { t: "h"; text: string }
  | { t: "p"; text: string }
  | { t: "b"; items: string[] }
  | { t: "small"; text: string }
  | { t: "gap" }
  | { t: "break" }

function docToPdfLines(blocks: DocBlock[]): PdfLine[] {
  const lines: PdfLine[] = []
  for (const block of blocks) {
    switch (block.t) {
      case "h1":
        pushWrapped(lines, block.text, { font: "F2", size: 21, wrapWidth: 42 })
        break
      case "sub":
        pushWrapped(lines, block.text, { font: "F1", size: 12, gapBefore: 8, wrapWidth: 78 })
        break
      case "meta":
        block.lines.forEach((line, index) => {
          pushWrapped(lines, line, { font: "F1", size: 10, gapBefore: index === 0 ? 12 : 2, wrapWidth: 92 })
        })
        break
      case "h":
        pushWrapped(lines, block.text, { font: "F2", size: 13.5, gapBefore: 20, wrapWidth: 62 })
        break
      case "p":
        pushWrapped(lines, block.text, { font: "F1", size: 11, gapBefore: 8 })
        break
      case "b":
        block.items.forEach((item, index) => {
          pushWrapped(lines, `-  ${item}`, {
            font: "F1",
            size: 11,
            gapBefore: index === 0 ? 8 : 4,
            wrapWidth: 84,
          })
        })
        break
      case "small":
        pushWrapped(lines, block.text, { font: "F1", size: 9.5, gapBefore: 10, wrapWidth: 96 })
        break
      case "gap":
        lines.push({ text: "", font: "F1", size: 11, gapBefore: 8 })
        break
      case "break":
        lines.push({ text: "", pageBreak: true })
        break
    }
  }
  return lines
}

function docToSourceText(blocks: DocBlock[]): string {
  const chunks: string[] = []
  for (const block of blocks) {
    switch (block.t) {
      case "h1":
      case "sub":
      case "h":
        chunks.push(block.text.toUpperCase())
        break
      case "meta":
        chunks.push(block.lines.join("\n"))
        break
      case "p":
      case "small":
        chunks.push(block.text)
        break
      case "b":
        chunks.push(block.items.map((item) => `- ${item}`).join("\n"))
        break
      default:
        break
    }
  }
  return chunks.join("\n\n")
}

function buildXlsx(rows: (string | number)[][], columnWidths: number[]): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  sheet["!cols"] = columnWidths.map((width) => ({ wch: width }))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1")
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer
}

function xlsxToSourceText(rows: (string | number)[][]): string {
  return rows.map((row) => row.join(" | ")).join("\n")
}

/* ---------------------------------------------------------------------------
 * Resource seeds: one entry per seeded file, covering every resource type.
 * ------------------------------------------------------------------------- */

type ResourceSeed = {
  key: string
  classCode: string | null
  title: string
  description: string
  resourceType: ResourceTypeValue
  fileName: string
  fileType: FileTypeValue
  uploadedDaysAgo: number
  bytes: Buffer
  sourceText: string
}

const LINEAR_EQUATIONS_NOTES: DocBlock[] = [
  { t: "h1", text: "Linear Equations in One Variable" },
  { t: "sub", text: "Mathematics 8 - First Quarter Lecture Notes" },
  { t: "meta", lines: ["Prepared by: Mr. Mark Louie", "San Isidro National High School"] },
  {
    t: "h",
    text: "1. Learning Objectives",
  },
  {
    t: "b",
    items: [
      "Define a linear equation in one variable and identify its standard form.",
      "Apply the properties of equality to solve equations step by step.",
      "Translate word problems into linear equations and solve them.",
    ],
  },
  { t: "h", text: "2. Key Definition" },
  {
    t: "p",
    text: "A linear equation in one variable is an equation that can be written in the form ax + b = 0, where a and b are real numbers and a is not equal to zero. The highest power of the variable is exactly one, which is why its graph would always be a straight line.",
  },
  { t: "p", text: "Examples: 3x + 5 = 20, 7 - 2y = 1, and 5(x - 2) = 3x + 9 are all linear equations in one variable." },
  { t: "h", text: "3. Properties of Equality" },
  {
    t: "b",
    items: [
      "Addition Property: adding the same number to both sides preserves the equality.",
      "Subtraction Property: subtracting the same number from both sides preserves the equality.",
      "Multiplication Property: multiplying both sides by the same nonzero number preserves the equality.",
      "Division Property: dividing both sides by the same nonzero number preserves the equality.",
    ],
  },
  { t: "h", text: "4. Steps for Solving" },
  {
    t: "b",
    items: [
      "Step 1: Simplify each side of the equation by removing parentheses and combining like terms.",
      "Step 2: Move all variable terms to one side using inverse operations.",
      "Step 3: Move all constant terms to the other side.",
      "Step 4: Divide both sides by the coefficient of the variable.",
      "Step 5: Check the answer by substituting it back into the original equation.",
    ],
  },
  { t: "h", text: "5. Worked Examples" },
  { t: "p", text: "Example 1. Solve 3x + 5 = 20." },
  {
    t: "b",
    items: [
      "Subtract 5 from both sides: 3x = 15.",
      "Divide both sides by 3: x = 5.",
      "Check: 3(5) + 5 = 20, which is true.",
    ],
  },
  { t: "p", text: "Example 2. Solve 5x - 8 = 2x + 7." },
  {
    t: "b",
    items: [
      "Subtract 2x from both sides: 3x - 8 = 7.",
      "Add 8 to both sides: 3x = 15.",
      "Divide both sides by 3: x = 5.",
      "Check: 5(5) - 8 = 17 and 2(5) + 7 = 17.",
    ],
  },
  { t: "h", text: "6. Common Mistakes to Avoid" },
  {
    t: "b",
    items: [
      "Forgetting to apply an operation to BOTH sides of the equation.",
      "Sign errors when moving terms across the equals sign.",
      "Skipping the checking step, which catches most arithmetic slips.",
    ],
  },
  { t: "small", text: "Next meeting: bring Problem Set 3 (see the Resources tab). We will check Parts A and B together." },
]

const PROBLEM_SET_WORKSHEET: DocBlock[] = [
  { t: "h1", text: "Problem Set 3: Solving Linear Equations" },
  { t: "sub", text: "Mathematics 8 - Narra | Total: 30 points" },
  {
    t: "meta",
    lines: [
      "Directions: Copy each item, then show your complete solution. Encircle the final answer.",
      "Submission: handwritten, before our next meeting. Answers without solutions earn no credit.",
    ],
  },
  { t: "h", text: "Part A. Two-Step Equations (2 points each)" },
  {
    t: "b",
    items: ["1. x + 7 = 15", "2. 4x = 36", "3. 2x - 5 = 11", "4. x/3 + 4 = 9", "5. 5x + 12 = 47", "6. 18 - 3x = 6"],
  },
  { t: "h", text: "Part B. Variables on Both Sides (3 points each)" },
  {
    t: "b",
    items: [
      "7. 5x = 2x + 21",
      "8. 7x - 4 = 3x + 12",
      "9. 9 - 2x = 4x - 15",
      "10. 6(x - 2) = 3x + 9",
    ],
  },
  { t: "h", text: "Part C. Word Problems (5 points each)" },
  {
    t: "b",
    items: [
      "11. Marco is three times as old as his sister. The sum of their ages is 24. How old is each of them?",
      "12. A rectangle is twice as long as it is wide. Its perimeter is 36 meters. Find its dimensions.",
    ],
  },
  { t: "break" },
  { t: "h", text: "Answer Key" },
  { t: "small", text: "Teacher copy only - detach this page before printing for the class." },
  {
    t: "b",
    items: [
      "1. x = 8",
      "2. x = 9",
      "3. x = 8",
      "4. x = 15",
      "5. x = 7",
      "6. x = 4",
      "7. x = 7",
      "8. x = 4",
      "9. x = 4",
      "10. x = 7",
      "11. Sister is 6 years old; Marco is 18 years old.",
      "12. Width = 6 m; Length = 12 m.",
    ],
  },
]

const DIGESTIVE_SYSTEM_DECK = {
  title: "The Human Digestive System",
  subtitle: "Science 8 - Narra | Life Science Unit",
  footer: "Follow along in class - the guided notes sheet is in the Resources tab.",
  pages: [
    {
      title: "Learning Targets",
      bullets: [
        "Trace the path of food through the digestive tract in order.",
        "Explain mechanical versus chemical digestion.",
        "Identify the role of each major organ of digestion.",
        "Describe healthy habits that protect the digestive system.",
      ],
    },
    {
      title: "What Is Digestion?",
      bullets: [
        "Digestion breaks food down into nutrients the body can absorb.",
        "Mechanical digestion physically breaks food into smaller pieces (chewing, churning).",
        "Chemical digestion uses enzymes to split large molecules into usable ones.",
        "The whole journey takes 24 to 72 hours from mouth to exit.",
      ],
    },
    {
      title: "Stop 1: The Mouth",
      bullets: [
        "Teeth grind food - mechanical digestion begins here.",
        "Saliva contains amylase, an enzyme that starts breaking down starch.",
        "The tongue shapes food into a bolus and pushes it toward the throat.",
      ],
    },
    {
      title: "Stop 2: Esophagus and Stomach",
      bullets: [
        "Peristalsis: rhythmic muscle contractions squeeze food downward.",
        "The stomach stores, mixes, and churns food for about 2-4 hours.",
        "Gastric juice (hydrochloric acid + pepsin) digests protein into chyme.",
      ],
    },
    {
      title: "Stop 3: The Small Intestine",
      bullets: [
        "Most chemical digestion AND nutrient absorption happen here.",
        "The liver sends bile to emulsify fats; the pancreas sends enzymes.",
        "Villi - millions of tiny folds - maximize the absorbing surface area.",
      ],
    },
    {
      title: "Stop 4: The Large Intestine",
      bullets: [
        "Absorbs water and minerals back into the bloodstream.",
        "Houses gut bacteria that produce some vitamins.",
        "Compacts the remaining waste into stool for elimination.",
      ],
    },
    {
      title: "Care for Your Digestive System",
      bullets: [
        "Eat fiber-rich food: fruits, vegetables, whole grains.",
        "Drink enough water throughout the day.",
        "Chew slowly and avoid skipping meals.",
        "Wash hands before eating to prevent infections.",
      ],
    },
    {
      title: "Quick Check",
      bullets: [
        "Where does chemical digestion of starch begin?",
        "Which organ produces bile, and where is bile stored?",
        "Why are villi important in the small intestine?",
      ],
    },
  ],
}

const CELL_THEORY_READING = `Cell Theory: From Cork Slices to Modern Biology

Introduction

Every living thing you have ever seen - from a single-celled amoeba in pond water to the tallest narra tree - is built from microscopic units called cells. The idea that all living things are made of cells feels obvious today, but it took scientists almost two hundred years of careful observation to establish it. This reading walks through how cell theory developed and why it remains one of the most important ideas in biology.

Robert Hooke and the First Look

In 1665, English scientist Robert Hooke examined a thin slice of cork under a crude compound microscope he had built himself. What he saw surprised him: thousands of tiny, empty boxes arranged like the rooms of a monastery. He called these boxes "cells," from the Latin cella, meaning small room. Hooke was actually looking at the dead cell walls of plant tissue, but his observation opened the door to a new way of studying life.

Anton van Leeuwenhoek, a Dutch tradesman, soon pushed further. Using hand-ground lenses, he observed living single-celled organisms in pond water, which he charmingly called "animalcules." His letters to the Royal Society in London gave the world its first glimpse of bacteria, protists, and sperm cells - proof that an entire invisible world existed all around and inside us.

From Observations to a Theory

For the next century and a half, microscopes improved slowly, and so did understanding. Then, between 1838 and 1855, three German scientists assembled the pieces:

1. Matthias Schleiden, a botanist, concluded in 1838 that all plants are made of cells.
2. Theodor Schwann, a zoologist, reached the same conclusion about animals in 1839.
3. Rudolf Virchow, a physician, proposed in 1855 that all cells come from pre-existing cells - challenging the old idea that life could spontaneously appear from nonliving matter.

Together, these principles became known as the cell theory:

- All living organisms are composed of one or more cells.
- The cell is the basic unit of structure and organization in living things.
- All cells arise from pre-existing cells through cell division.

Why Cell Theory Still Matters

Modern biology continues to confirm and extend these ideas. DNA replication, cancer research, stem-cell therapy, and even vaccine development all rest on the foundation that cells are the units of life. When scientists culture bacteria in a laboratory or grow replacement tissue for burn victims, they apply Virchow's principle directly: new cells come from existing cells.

Mini-Glossary

- Cell: the smallest structural and functional unit of life.
- Organelle: a specialized structure inside a cell with a specific job.
- Spontaneous generation: the disproven belief that living things arise from nonliving matter.
- Cell division: the process by which one cell becomes two identical daughter cells.

Review Questions

1. Why did Hooke name the structures he saw "cells," and what was he actually observing?
2. Which part of the cell theory did Virchow contribute, and what earlier belief did it disprove?
3. Give one modern example showing how cell theory is applied outside the classroom.`

const PERIODIC_TABLE_ROWS: (string | number)[][] = [
  ["Atomic Number (Z)", "Symbol", "Element Name", "Atomic Mass (u)", "Group", "Period", "Classification"],
  [1, "H", "Hydrogen", 1.008, 1, 1, "Nonmetal"],
  [2, "He", "Helium", 4.003, 18, 1, "Noble gas"],
  [3, "Li", "Lithium", 6.94, 1, 2, "Alkali metal"],
  [4, "Be", "Beryllium", 9.012, 2, 2, "Alkaline earth metal"],
  [5, "B", "Boron", 10.81, 13, 2, "Metalloid"],
  [6, "C", "Carbon", 12.011, 14, 2, "Nonmetal"],
  [7, "N", "Nitrogen", 14.007, 15, 2, "Nonmetal"],
  [8, "O", "Oxygen", 15.999, 16, 2, "Nonmetal"],
  [9, "F", "Fluorine", 18.998, 17, 2, "Halogen"],
  [10, "Ne", "Neon", 20.18, 18, 2, "Noble gas"],
  [11, "Na", "Sodium", 22.99, 1, 3, "Alkali metal"],
  [12, "Mg", "Magnesium", 24.305, 2, 3, "Alkaline earth metal"],
  [13, "Al", "Aluminum", 26.982, 13, 3, "Post-transition metal"],
  [14, "Si", "Silicon", 28.085, 14, 3, "Metalloid"],
  [15, "P", "Phosphorus", 30.974, 15, 3, "Nonmetal"],
  [16, "S", "Sulfur", 32.06, 16, 3, "Nonmetal"],
  [17, "Cl", "Chlorine", 35.45, 17, 3, "Halogen"],
  [18, "Ar", "Argon", 39.95, 18, 3, "Noble gas"],
  [19, "K", "Potassium", 39.098, 1, 4, "Alkali metal"],
  [20, "Ca", "Calcium", 40.078, 2, 4, "Alkaline earth metal"],
  [],
  ["Notes:", "Group = vertical column; elements in the same group share similar chemical properties."],
  ["", "Period = horizontal row; atomic number increases left to right."],
  ["", "Use this sheet during the Element Bingo activity and the Chapter 4 quiz."],
]

const FIVE_PARAGRAPH_ESSAY_GUIDE = `The Five-Paragraph Essay: A Practical Guide for English 8

Why This Structure Works

The five-paragraph essay gives readers a predictable journey: a clear promise in the introduction, three focused stops along the way, and a satisfying conclusion. Mastering this pattern first makes it easier to experiment with more flexible structures later in high school and college.

Part One: The Introduction

Your introduction has three jobs. First, hook the reader with a surprising fact, a short scene, a question, or a bold claim. Second, give just enough background so the hook makes sense. Third, end with your thesis statement - a single sentence that states your main idea and previews your three supporting points.

Weak thesis: "This essay is about school uniforms."
Strong thesis: "School uniforms should be required because they reduce social pressure, simplify morning routines, and sharpen students' focus on learning."

Part Two: Body Paragraphs (x3)

Each body paragraph develops ONE point from the thesis. Use the PEEL pattern:

- Point: open with a topic sentence stating the paragraph's main idea.
- Evidence: provide a fact, statistic, quotation, or concrete example.
- Explanation: explain how the evidence supports your point - this is where most marks are earned.
- Link: close with a sentence that ties back to the thesis or transitions forward.

Order your paragraphs from strongest to weakest argument, and devote roughly equal space to each.

Part Three: The Conclusion

Do not simply repeat your introduction. Restate the thesis in fresh words, briefly summarize the three points, then end with a final thought: a call to action, a prediction, or a connection to a bigger issue. A conclusion should feel like landing, not stopping.

Transition Bank

- To add: furthermore, in addition, moreover
- To contrast: however, on the other hand, nevertheless
- To show cause: consequently, therefore, as a result
- To conclude: ultimately, in the end, taken together

Common Pitfalls

- Announcing instead of arguing ("In this essay I will talk about...").
- Burying the thesis in the middle of the introduction.
- Evidence without explanation - quotes never speak for themselves.
- New arguments appearing in the conclusion.

Practice Task

Draft a five-paragraph essay answering: "Should students be allowed to bring smartphones to class?" Bring your outline and first draft to Thursday's peer-review workshop.`

const PEER_REVIEW_CHECKLIST: DocBlock[] = [
  { t: "h1", text: "Peer Review Checklist" },
  { t: "sub", text: "English 8 - Molave | Essay Workshop Handout" },
  {
    t: "meta",
    lines: [
      "Reviewer: ____________________________  Date: ______________",
      "Writer: ______________________________  Essay title: ______________________________",
      "Directions: Read your partner's draft twice - once for meaning, once for this checklist.",
    ],
  },
  { t: "h", text: "Content and Ideas" },
  {
    t: "b",
    items: [
      "[ ] The thesis clearly states one main idea and previews the supporting points.",
      "[ ] Every body paragraph connects directly back to the thesis.",
      "[ ] Each claim is supported with specific evidence or examples.",
      "[ ] The explanation shows HOW the evidence proves the point.",
    ],
  },
  { t: "h", text: "Organization" },
  {
    t: "b",
    items: [
      "[ ] The introduction hooks the reader and ends with the thesis.",
      "[ ] Body paragraphs follow the PEEL pattern in a logical order.",
      "[ ] Transitions connect sentences, paragraphs, and ideas smoothly.",
      "[ ] The conclusion lands with a final thought, not a summary dump.",
    ],
  },
  { t: "h", text: "Style and Mechanics" },
  {
    t: "b",
    items: [
      "[ ] Word choice is precise - repeated filler words are replaced.",
      "[ ] Sentences vary in length and openings.",
      "[ ] Spelling, punctuation, and verb tenses are checked.",
    ],
  },
  { t: "h", text: "Feedback: Two Stars and a Wish" },
  {
    t: "b",
    items: [
      "Star 1 (what worked well): ________________________________________",
      "Star 2 (another strength): ________________________________________",
      "Wish (one concrete suggestion): ____________________________________",
    ],
  },
  { t: "small", text: "Remember: critique the writing, never the writer. Be as specific as you would want others to be with yours." },
]

const SPANISH_COLONIZATION_NOTES = `ANG PANANAKOP NG MGA ESPANYOL SA PILIPINAS - MGA TALA

Araling Panlipunan 8 - Narra

LAYUNIN NG PAG-AARAL
- Maipaliwanag ang tatlong pangunahing layunin ng Espanya sa pagkolonya ng Pilipinas.
- Masusuri ang epekto ng sistemang encomienda at polo y servicio sa mga Pilipino.
- Makapagbibigay ng halimbawa ng mga maagang pag-aalsa laban sa Espanya.

BAKIT SILA DUMATING: ANG TATLONG "G"
1. Ginto (Kayamanan) - naghahanap ang Espanya ng pampalakas sa kalakalan ng pampanga at ng mga bagong yamang-mineral.
2. Diyos (Relihiyon) - misyonerong prayle ang nagpasimula ng pagpapalaganap ng Katolisismo.
3. Kapangyarihan (Glorya) - nais ng korona ng Espanya na palawakin ang imperyo nito sa Asya laban sa Portugal at iba't ibang bansa.

MAHAHALAGANG PETSANG TANDAAN
- Marso 31, 1521 - dumaong si Ferdinand Magellan sa Leyte; unang Misa sa Limasawa.
- Abril 27, 1521 - Labanan sa Mactan; natalo si Magellan kay Lapulapu.
- 1565 - dumating si Miguel Lopez de Legazpi; nagsimula ang permanenteng paninirahan sa Cebu.
- 1571 - itinatag ang Maynila bilang kabisera ng kolonya.

SISTEMANG ENCOMIENDA
Ang encomienda ay lupaing ipinagkatiwala sa isang Espanyol na tinatawag na encomendero. Kapalit ng proteksyon at relihiyosong edukasyon, singilin ang mga katutubo ng tributo o buwis. Sa praktika, madalas abusado ang mga encomendero kaya lumaganap ang kahirapan sa mga barangay.

POLO Y SERVICIO
Ang polo y servicio ay sapilitang paggawa ng mga lalaking Pilipino na edad 16 hanggang 60 sa loob ng apatnapung araw kada taon. Sila ang nagtayo ng simbahan, tulay, kalsada, at galleon. Ang falta - pagbabayad para makaiwas - ay hindi kayang bayaran ng karamihan.

EPEKTO SA EDUKASYON AT RELIHIYON
- Itinatag ang mga paaralang parokya at unibersidad tulng ng Universidad de Santo Tomas (1611).
- Nagkaroon ng Doctrina Christiana (1593), ang kauna-unahang aklat na nalimbag sa Pilipinas.
- Lumaganap ang Katolisismo, ngunit nanatili rin ang mga katutubong paniniwala sa ilalim nito.

MAAGANG PAG-AALSA
Hindi tahimik ang pananakop: sina Lakandula (1574), Sumuroy (1649), at Diego at Gabriela Silang (1763) ay ilan lamang sa namuno ng mga pag-aalsa. Karaniwang dahil: mataas na buwis, sapilitang paggawa, at pang-aabuso ng mga prayle.

GABAY SA PAG-AARAL
1. Ipaliwanag kung bakit tinawag na "tatlong G" ang mga layunin ng Espanya.
2. Ano ang pagkakaiba ng encomienda at polo y servicio?
3. Bakit mahalaga ang Labanan sa Mactan sa kasaysayan ng ating pagkabansa?
4. Magbigay ng dalawang dahilan ng mga maagang pag-aalsa.`

const HTML_CHEAT_SHEET_ROWS: (string | number)[][] = [
  ["Tag", "Purpose", "Example"],
  ["<html>", "Root element that wraps the entire page", "<html>...</html>"],
  ["<head>", "Contains metadata: title, links, styles", "<head><title>Home</title></head>"],
  ["<title>", "Text shown on the browser tab", "<title>My Portfolio</title>"],
  ["<body>", "All visible page content lives here", "<body><p>Hello!</p></body>"],
  ["<h1> to <h6>", "Headings, largest to smallest", "<h1>Welcome</h1>"],
  ["<p>", "Paragraph of text", "<p>ICT 9 rocks.</p>"],
  ["<a>", "Hyperlink to another page or site", '<a href="https://example.com">Visit</a>'],
  ["<img>", "Displays an image from a source URL", '<img src="logo.png" alt="Logo">'],
  ["<ul>", "Unordered (bulleted) list container", "<ul><li>Item</li></ul>"],
  ["<ol>", "Ordered (numbered) list container", "<ol><li>First</li></ol>"],
  ["<li>", "A single list item", "<li>Motherboard</li>"],
  ["<table>", "Builds a data table", "<table>...</table>"],
  ["<tr>", "One table row", "<tr><td>A</td></tr>"],
  ["<td>", "One table cell (data)", "<td>RAM</td>"],
  ["<strong>", "Bold text with importance", "<strong>Safety first</strong>"],
  ["<em>", "Emphasized (italic) text", "<em>Note:</em>"],
  ["<div>", "Block container for grouping content", '<div class="card">...</div>'],
  ["<span>", "Inline container for styling text", '<span class="price">P50</span>'],
  ["<button>", "Clickable button", "<button>Submit</button>"],
  ["<br>", "Line break inside text", "Roses are red<br>Violets are blue"],
  ["<hr>", "Horizontal rule divider", "<hr>"],
]

const CSS_REVIEWER = `COMPUTER SYSTEMS SERVICING 9 - FIRST QUARTER REVIEWER

SCOPE OF THE QUARTER EXAM
Units covered: (1) Computer Fundamentals, (2) Hardware Components, (3) Operating Systems Basics, (4) Occupational Health and Safety.

UNIT 1: COMPUTER FUNDAMENTALS
A computer is an electronic device that accepts data (input), processes it according to instructions, produces information (output), and saves results (storage). This is the IPOS cycle: Input - Process - Output - Storage.
- Data: raw, unorganized facts.
- Information: processed, meaningful data.
Hardware refers to physical parts; software refers to programs and instructions. System software (like Windows or Linux) runs the machine; application software (like browsers and editors) does tasks for users.

UNIT 2: HARDWARE COMPONENTS
Know the function of each part for labeling-type questions:
- Motherboard: the main circuit board connecting all components.
- CPU (processor): executes instructions; measured partly by clock speed in GHz.
- RAM: temporary working memory; contents are lost when power is off (volatile).
- ROM: permanent startup instructions (non-volatile).
- Hard Disk Drive (HDD)/Solid State Drive (SSD): long-term storage; SSDs are faster with no moving parts.
- Power Supply Unit (PSU): converts wall AC power to DC voltages components need.
- GPU: renders images and video output.
Common ports: USB, HDMI (video+audio), Ethernet (network), VGA (older video), audio jack.

UNIT 3: OPERATING SYSTEM BASICS
Functions of an OS: manage memory, schedule CPU tasks, control hardware devices through drivers, manage files and folders, and provide the user interface (GUI or CLI). File extensions to memorize: .exe (program), .txt (plain text), .jpg/.png (images), .mp3 (audio), .mp4 (video), .zip (compressed archive).

UNIT 4: OCCUPATIONAL HEALTH AND SAFETY
- Electrostatic discharge (ESD) can silently destroy chips; wear an anti-static wrist strap and work on an anti-static mat.
- Always UNPLUG the unit before opening the case.
- Hold boards by the edges; never touch gold contacts or chip pins.
- Keep drinks away from the workbench; secure loose cables to prevent trips.
- Lift with your legs, not your back, when moving system units.

NUMBER SYSTEMS QUICK REVIEW
Binary uses only 0 and 1. To convert binary 1011 to decimal: (1x8) + (0x4) + (1x2) + (1x1) = 11. To convert decimal 13 to binary: 13 = 8 + 4 + 1 = 1101.

PRACTICE QUESTIONS
1. Arrange the IPOS cycle stages in order.
2. Which component loses its data when power is cut: RAM or SSD?
3. Give two differences between HDD and SSD.
4. Why is an anti-static wrist strap used during assembly?
5. Convert binary 11101 to decimal.
6. Name the port used to connect a monitor with video and audio in one cable.
7. What does a device driver allow the operating system to do?
8. List three safety practices before opening a computer case.

ANSWER KEY (self-check after answering)
1. Input, Process, Output, Storage. 2. RAM (volatile). 3. SSD has no moving parts and is faster; HDD offers cheaper cost per gigabyte. 4. It safely grounds you to prevent electrostatic discharge damage. 5. 29. 6. HDMI. 7. Communicate with and control a specific hardware device. 8. Unplug the unit, wear an ESD strap, clear the workspace of liquids/cables (any three).`

const GRADE_TEMPLATE_ROWS: (string | number)[][] = [
  ["QUARTERLY GRADE COMPUTATION TEMPLATE - MATHEMATICS 8"],
  ["Initial Grade = (Written Works x 0.30) + (Performance Tasks x 0.50) + (Quarterly Exam x 0.20)"],
  ["Enter component scores as percentages. Transmute the Initial Grade using the official DepEd table before posting."],
  [],
  ["No.", "Student Name", "Written Works (30%)", "Performance Tasks (50%)", "Quarterly Exam (20%)", "Initial Grade", "Remarks"],
  [1, "Aquino, Mariel", 91, 88, 93, 89.9, ""],
  [2, "Bautista, Kevin", 85, 90, 87, 87.9, ""],
  [3, "Castillo, Nathan", 78, 82, 75, 79.4, ""],
  [4, "Lim, Bianca", 95, 96, 98, 96.1, ""],
  [5, "Mercado, Paolo", 88, 85, 84, 85.7, ""],
  [6, "Ocampo, Trisha", 92, 94, 90, 92.6, ""],
  [7, "Reyes, Miguel", 80, 76, 82, 78.6, ""],
  [8, "Santos, Ariana", 90, 92, 89, 91.0, ""],
  [],
  ["Legend:", "WW = quizzes, assignments, seatwork; PT = projects, labs, performances; QE = quarterly assessment."],
  ["Reminder:", "Weights above follow Math/Science/English/AP/Filipino subjects. MAPEH and EPP/TLE use different weights."],
]

const RESEARCH_OUTLINE_TEMPLATE: DocBlock[] = [
  { t: "h1", text: "Research Paper Outline Template" },
  { t: "sub", text: "Research 10 - Acacia | Practical Research 1 (Qualitative)" },
  {
    t: "meta",
    lines: [
      "Directions: Replace every bracketed [ ] section with your own text. Submit as a printed copy.",
      "Format reminder: Times New Roman 12, double-spaced, 1-inch margins, APA 7th edition.",
    ],
  },
  { t: "h", text: "I. Title Page" },
  {
    t: "b",
    items: [
      "[Research title - 12 to 15 words, includes variables/participants/locale]",
      "[Your name, Grade and Section]",
      "[Subject teacher, School name, School year]",
    ],
  },
  { t: "h", text: "II. Abstract (150-250 words)" },
  { t: "p", text: "[One paragraph: purpose, participants, method, key findings, conclusion. Write this LAST.]" },
  { t: "h", text: "III. Introduction" },
  {
    t: "b",
    items: [
      "[Background of the study - 2 to 3 paragraphs narrowing from broad to specific]",
      "[Statement of the problem - list 3 to 5 research questions ending in question marks]",
      "[Significance of the study - who benefits and how]",
      "[Scope and delimitation - coverage, participants, locale, limits]",
    ],
  },
  { t: "h", text: "IV. Literature Review" },
  {
    t: "b",
    items: [
      "[Theme 1 - related studies with author-year citations]",
      "[Theme 2 - related studies with author-year citations]",
      "[Synthesis - what the combined studies say and the research gap your study fills]",
    ],
  },
  { t: "h", text: "V. Methodology" },
  {
    t: "b",
    items: [
      "[Research design - e.g., descriptive qualitative; justify the choice]",
      "[Participants and sampling - who, how many, how chosen]",
      "[Instrument - interview guide / observation checklist; attach a copy as Appendix A]",
      "[Data collection procedure - step-by-step account]",
      "[Ethical considerations - consent, anonymity, voluntary participation]",
    ],
  },
  { t: "h", text: "VI. Results and Discussion" },
  {
    t: "b",
    items: [
      "[Present themes that emerged; support each with quoted responses]",
      "[Interpret findings against your literature review]",
      "[State limitations honestly]",
    ],
  },
  { t: "h", text: "VII. References" },
  { t: "p", text: "[Alphabetical list of ALL cited sources in APA 7th edition format. See the APA Quick Guide in Resources.]" },
  { t: "small", text: "Checklist before submission: title page complete - questions answerable - citations match references - appendices labeled." },
]

const APA_CITATION_GUIDE: DocBlock[] = [
  { t: "h1", text: "Citing Sources in APA 7th Edition" },
  { t: "sub", text: "A Quick Guide for Research 10 Papers" },
  {
    t: "meta",
    lines: ["Prepared for: Research 10 - Acacia", "Keep this beside you whenever you draft or edit your paper."],
  },
  { t: "h", text: "1. Why We Cite" },
  {
    t: "p",
    text: "Citation protects you from plagiarism, lets readers verify your sources, and credits the researchers whose work you built on. In research papers, EVERY borrowed idea needs citation - not only direct quotations. If you paraphrase a study's finding in your own words, you still cite it.",
  },
  { t: "h", text: "2. In-Text Citations" },
  {
    t: "b",
    items: [
      "Paraphrase, one author: Reading daily improves vocabulary (Santos, 2023).",
      "Quotation with page number: \"Reading is exercise for the brain\" (Santos, 2023, p. 14).",
      "Narrative form: Santos (2023) found that daily reading improves vocabulary.",
      "Two authors: always list both - (Lim & Reyes, 2022).",
      "Three or more authors: use et al. from the first citation - (Aquino et al., 2024).",
      "Organization as author: (Department of Education [DepEd], 2020), then (DepEd, 2020) after.",
    ],
  },
  { t: "h", text: "3. Reference List Rules" },
  {
    t: "b",
    items: [
      "Start on a new page titled References, centered and bold.",
      "Arrange entries alphabetically by the first author's surname.",
      "Use a hanging indent: first line flush left, following lines indented half an inch.",
      "Include the DOI when available, formatted as https://doi.org/xxxx.",
    ],
  },
  { t: "h", text: "4. Common Formats" },
  { t: "p", text: "Book: Santos, R. (2023). Reading habits of Filipino teenagers. National Book Press." },
  {
    t: "p",
    text: "Journal article: Lim, B., & Reyes, M. (2022). Study habits and quiz performance. Philippine Journal of Education, 45(2), 101-115. https://doi.org/10.xxxx/pje.2022.452",
  },
  { t: "p", text: "Webpage with date: Department of Education. (2024, June 3). Academic recovery program guidelines. https://www.deped.gov.ph/example" },
  { t: "p", text: "YouTube video: Escobar, S. [SciEscoba]. (2024, March 12). Cell division explained [Video]. YouTube. https://www.youtube.com/watch?v=xxxxx" },
  { t: "h", text: "5. Quick Self-Check Before Submission" },
  {
    t: "b",
    items: [
      "Does every in-text citation appear in the reference list, and vice versa?",
      "Are all reference entries alphabetized with hanging indents?",
      "Are direct quotes under 40 words enclosed in quotation marks with a page number?",
      "Did you cite yourself honestly - no recycled work from previous years?",
    ],
  },
]

const CLASSROOM_POLICIES: DocBlock[] = [
  { t: "h1", text: "Classroom Policies and Grading System" },
  { t: "sub", text: "School Year 2026-2027 | San Isidro National High School" },
  { t: "meta", lines: ["Adviser: Mr. Mark Louie", "Applies to: Grades 8-10 advisory and subject classes"] },
  { t: "h", text: "Attendance" },
  {
    t: "b",
    items: [
      "Be seated before the second bell. Three tardiness records equal one absence notice to parents.",
      "Excused absences require a parent letter or clinic slip presented within two days.",
      "Students absent on quiz day take the make-up quiz within one week of returning.",
    ],
  },
  { t: "h", text: "Outputs and Late Work" },
  {
    t: "b",
    items: [
      "Assignments are due at the START of class; uploads count by timestamp.",
      "Late outputs lose 5 percentage points per school day, up to a maximum of 3 days.",
      "After 3 days, outputs may still be submitted for feedback but receive a 70 ceiling.",
      "Technology problems the night before a deadline are not excused - plan uploads early.",
    ],
  },
  { t: "h", text: "Academic Honesty" },
  {
    t: "p",
    text: "Submitted work must be your own. Copying homework, sharing quiz answers, or submitting AI-generated text as your own writing counts as dishonesty: first offense earns a retake with a 75 ceiling and a parent conversation; repeated offenses are referred to the guidance office. When in doubt, disclose your sources.",
  },
  { t: "h", text: "Materials and Conduct" },
  {
    t: "b",
    items: [
      "Bring the subject notebook, pen, and any announced handout every meeting.",
      "Phones stay silent and inside bags unless the activity says otherwise.",
      "Respect speaking turns - raise your hand and listen while others finish.",
      "Food stays outside the computer laboratory at all times.",
    ],
  },
  { t: "h", text: "Grading System (DepEd Order 8, s. 2015)" },
  {
    t: "b",
    items: [
      "Written Works - 30%: quizzes, assignments, seatwork.",
      "Performance Tasks - 50%: projects, experiments, presentations, portfolios.",
      "Quarterly Assessment - 20%: the scheduled quarterly test.",
      "Quarterly grade = weighted sum of the three components, transmuted per the official DepEd table.",
    ],
  },
  { t: "h", text: "Communication" },
  {
    t: "p",
    text: "Announcements are posted in class channels and the Announcements tab. For private concerns, message through Upclass messaging or the adviser's consultation hour: Tuesday and Friday, 11:00 AM to 12:00 NN, Faculty Room 2.",
  },
]

const RESOURCES: ResourceSeed[] = [
  {
    key: "linear-equations-notes",
    classCode: "MATH8-N",
    title: "Linear Equations in One Variable - Lecture Notes",
    description:
      "Complete first-quarter notes: standard form, properties of equality, solving steps, and worked examples with checks.",
    resourceType: "notes",
    fileName: "linear-equations-lecture-notes.pdf",
    fileType: "pdf",
    uploadedDaysAgo: 21,
    bytes: buildDocumentPdf(docToPdfLines(LINEAR_EQUATIONS_NOTES)),
    sourceText: docToSourceText(LINEAR_EQUATIONS_NOTES),
  },
  {
    key: "problem-set-3-worksheet",
    classCode: "MATH8-N",
    title: "Problem Set 3: Solving Linear Equations",
    description:
      "Printable worksheet with two-step equations, variables on both sides, and word problems. Answer key included on the last page.",
    resourceType: "worksheet",
    fileName: "problem-set-3-linear-equations.pdf",
    fileType: "pdf",
    uploadedDaysAgo: 9,
    bytes: buildDocumentPdf(docToPdfLines(PROBLEM_SET_WORKSHEET)),
    sourceText: docToSourceText(PROBLEM_SET_WORKSHEET),
  },
  {
    key: "digestive-system-deck",
    classCode: "SCI8-N",
    title: "The Human Digestive System - Slide Deck",
    description:
      "Eight-slide lecture deck tracing the digestive tract from mouth to large intestine, with learning targets and a quick check.",
    resourceType: "slides",
    fileName: "digestive-system-slides.pdf",
    fileType: "pdf",
    uploadedDaysAgo: 14,
    bytes: buildSlidePdf(DIGESTIVE_SYSTEM_DECK),
    sourceText: [
      `THE HUMAN DIGESTIVE SYSTEM`,
      DIGESTIVE_SYSTEM_DECK.subtitle,
      ...DIGESTIVE_SYSTEM_DECK.pages.flatMap((page) => [
        page.title.toUpperCase(),
        ...page.bullets.map((bullet) => `- ${bullet}`),
      ]),
    ].join("\n\n"),
  },
  {
    key: "cell-theory-reading",
    classCode: "SCI8-N",
    title: "Cell Theory: From Cork Slices to Modern Biology",
    description:
      "Supplementary reading on how Hooke, Leeuwenhoek, Schleiden, Schwann, and Virchow built the cell theory, with glossary and review questions.",
    resourceType: "reading",
    fileName: "cell-theory-reading.txt",
    fileType: "txt",
    uploadedDaysAgo: 11,
    bytes: Buffer.from(CELL_THEORY_READING, "utf8"),
    sourceText: CELL_THEORY_READING,
  },
  {
    key: "periodic-table-reference",
    classCode: "SCI8-N",
    title: "Periodic Table Reference: First 20 Elements",
    description:
      "Spreadsheet of elements 1-20 with symbols, atomic masses, group, period, and classification for quiz review and Element Bingo.",
    resourceType: "reference",
    fileName: "periodic-table-first-20.xlsx",
    fileType: "xlsx",
    uploadedDaysAgo: 30,
    bytes: buildXlsx(PERIODIC_TABLE_ROWS, [16, 10, 18, 14, 8, 8, 24]),
    sourceText: xlsxToSourceText(PERIODIC_TABLE_ROWS),
  },
  {
    key: "five-paragraph-essay-guide",
    classCode: "ENG8-M",
    title: "The Five-Paragraph Essay: A Practical Guide",
    description:
      "Guide to thesis statements, the PEEL paragraph pattern, transition banks, and common essay pitfalls ahead of the workshop.",
    resourceType: "reading",
    fileName: "five-paragraph-essay-guide.txt",
    fileType: "txt",
    uploadedDaysAgo: 17,
    bytes: Buffer.from(FIVE_PARAGRAPH_ESSAY_GUIDE, "utf8"),
    sourceText: FIVE_PARAGRAPH_ESSAY_GUIDE,
  },
  {
    key: "peer-review-checklist",
    classCode: "ENG8-M",
    title: "Peer Review Checklist",
    description:
      "Workshop handout for reviewing classmates' essay drafts: content, organization, mechanics, plus two stars and a wish feedback boxes.",
    resourceType: "template",
    fileName: "peer-review-checklist.pdf",
    fileType: "pdf",
    uploadedDaysAgo: 6,
    bytes: buildDocumentPdf(docToPdfLines(PEER_REVIEW_CHECKLIST)),
    sourceText: docToSourceText(PEER_REVIEW_CHECKLIST),
  },
  {
    key: "spanish-colonization-notes",
    classCode: "AP8-N",
    title: "Ang Pananakop ng mga Espanyol sa Pilipinas - Mga Tala",
    description:
      "Buod ng aralin: tatlong layunin ng Espanya, mahahalagang petsa, encomienda, polo y servicio, at mga maagang pag-aalsa.",
    resourceType: "notes",
    fileName: "pananakop-ng-espanyol-notes.txt",
    fileType: "txt",
    uploadedDaysAgo: 25,
    bytes: Buffer.from(SPANISH_COLONIZATION_NOTES, "utf8"),
    sourceText: SPANISH_COLONIZATION_NOTES,
  },
  {
    key: "html-cheat-sheet",
    classCode: "ICT9-A",
    title: "HTML Elements Cheat Sheet",
    description:
      "Reference table of 21 essential HTML tags with purpose and syntax examples for the personal webpage project.",
    resourceType: "reference",
    fileName: "html-elements-cheat-sheet.xlsx",
    fileType: "xlsx",
    uploadedDaysAgo: 33,
    bytes: buildXlsx(HTML_CHEAT_SHEET_ROWS, [16, 44, 52]),
    sourceText: xlsxToSourceText(HTML_CHEAT_SHEET_ROWS),
  },
  {
    key: "css-quarterly-reviewer",
    classCode: "ICT9-A",
    title: "Computer Systems Servicing - Quarterly Reviewer",
    description:
      "First-quarter exam coverage: IPOS cycle, hardware identification, OS basics, OHS and ESD safety, number systems, plus practice items with answers.",
    resourceType: "notes",
    fileName: "css-quarterly-reviewer.txt",
    fileType: "txt",
    uploadedDaysAgo: 4,
    bytes: Buffer.from(CSS_REVIEWER, "utf8"),
    sourceText: CSS_REVIEWER,
  },
  {
    key: "grade-computation-template",
    classCode: "MATH8-N",
    title: "Quarterly Grade Computation Template",
    description:
      "Spreadsheet implementing the DepEd weighting (WW 30%, PT 50%, QE 20%) with eight sample rows ready to replace with real scores.",
    resourceType: "template",
    fileName: "quarterly-grade-computation.xlsx",
    fileType: "xlsx",
    uploadedDaysAgo: 38,
    bytes: buildXlsx(GRADE_TEMPLATE_ROWS, [6, 24, 20, 22, 22, 12, 12]),
    sourceText: xlsxToSourceText(GRADE_TEMPLATE_ROWS),
  },
  {
    key: "research-paper-outline-template",
    classCode: "RES10-A",
    title: "Research Paper Outline Template (APA 7th)",
    description:
      "Chapter-by-chapter scaffold for the practical research paper with bracketed prompts for every required section.",
    resourceType: "template",
    fileName: "research-paper-outline-template.pdf",
    fileType: "pdf",
    uploadedDaysAgo: 19,
    bytes: buildDocumentPdf(docToPdfLines(RESEARCH_OUTLINE_TEMPLATE)),
    sourceText: docToSourceText(RESEARCH_OUTLINE_TEMPLATE),
  },
  {
    key: "apa-quick-guide",
    classCode: "RES10-A",
    title: "Citing Sources in APA 7th Edition - Quick Guide",
    description:
      "In-text citation patterns, reference list formatting rules, and ready-to-copy formats for books, journals, webpages, and videos.",
    resourceType: "reading",
    fileName: "apa-7th-quick-guide.pdf",
    fileType: "pdf",
    uploadedDaysAgo: 19,
    bytes: buildDocumentPdf(docToPdfLines(APA_CITATION_GUIDE)),
    sourceText: docToSourceText(APA_CITATION_GUIDE),
  },
  {
    key: "classroom-policies",
    classCode: null,
    title: "Classroom Policies and Grading System (SY 2026-2027)",
    description:
      "School-wide reference covering attendance, late work rules, academic honesty, conduct expectations, and the DepEd grading breakdown.",
    resourceType: "other",
    fileName: "classroom-policies-2026-2027.pdf",
    fileType: "pdf",
    uploadedDaysAgo: 45,
    bytes: buildDocumentPdf(docToPdfLines(CLASSROOM_POLICIES)),
    sourceText: docToSourceText(CLASSROOM_POLICIES),
  },
]

/* ---------------------------------------------------------------------------
 * Seeding logic
 * ------------------------------------------------------------------------- */

async function ensureOwner() {
  const [existing] = await db.select().from(user).where(eq(user.email, OWNER_EMAIL)).limit(1)
  if (existing) return existing

  await db
    .insert(user)
    .values({
      id: "seed-user-mark-louie",
      name: OWNER_NAME,
      email: OWNER_EMAIL,
      emailVerified: true,
      bio: "Science and mathematics teacher. Uses Google sign-in.",
    })
    .onConflictDoNothing()

  const [created] = await db.select().from(user).where(eq(user.email, OWNER_EMAIL)).limit(1)
  if (!created) throw new Error(`Failed to create owner user ${OWNER_EMAIL}`)
  console.log(`Created owner user: ${OWNER_EMAIL}`)
  return created
}

async function ensureOrg(ownerId: string) {
  const [existing] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, ORG_SLUG))
    .limit(1)
  if (existing) return existing

  const [created] = await db
    .insert(organizations)
    .values({ id: "seed-org-san-isidro-nhs", ...ORG, slug: ORG_SLUG, createdBy: ownerId })
    .onConflictDoNothing()
    .returning()

  if (created) {
    console.log(`Created organization: ${created.name} (${ORG_SLUG})`)
    return created
  }

  const [raced] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, ORG_SLUG))
    .limit(1)
  if (!raced) throw new Error("Failed to create organization")
  return raced
}

async function ensureStudents(): Promise<{ id: string; name: string; email: string }[]> {
  await db
    .insert(user)
    .values(
      STUDENT_NAMES.map((name, index) => ({
        id: `seed-student-${String(index + 1).padStart(2, "0")}`,
        name,
        email: slugifyEmail(name),
        emailVerified: true,
        bio: studentBio(index),
      })),
    )
    .onConflictDoNothing()

  const students = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(inArray(user.email, STUDENT_NAMES.map(slugifyEmail)))

  if (students.length !== STUDENT_NAMES.length) {
    throw new Error(`Expected ${STUDENT_NAMES.length} students, found ${students.length}`)
  }
  return students.sort((a, b) => a.id.localeCompare(b.id))
}

async function main() {
  console.log("Seeding Upclass demo data...")
  const owner = await ensureOwner()
  const org = await ensureOrg(owner.id)
  const students = await ensureStudents()

  await db
    .insert(orgMembership)
    .values({
      id: `seed-om-owner-${org.id}`,
      orgId: org.id,
      userId: owner.id,
      role: "owner" as const,
    })
    .onConflictDoNothing()

  await db
    .insert(orgMembership)
    .values(
      students.map((student) => ({
        id: `seed-om-${org.id}-${student.id}`,
        orgId: org.id,
        userId: student.id,
        role: "student" as const,
      })),
    )
    .onConflictDoNothing()

  const classIdByCode = new Map<string, string>()
  for (const seed of CLASS_SEEDS) {
    const [existing] = await db.select().from(classes).where(eq(classes.code, seed.code)).limit(1)
    const classId =
      existing?.id ??
      (
        await db
          .insert(classes)
          .values({
            id: `seed-class-${seed.key}`,
            orgId: org.id,
            title: seed.title,
            description: seed.description,
            gradeLevel: seed.gradeLevel,
            section: seed.section,
            color: seed.color,
            schedule: seed.schedule,
            code: seed.code,
            codeEnabled: true,
            ownerId: owner.id,
          })
          .onConflictDoNothing()
          .returning()
      )[0]?.id

    if (!classId) throw new Error(`Failed to create class ${seed.code}`)
    classIdByCode.set(seed.code, classId)
    if (!existing) console.log(`Created class: ${seed.title} (${seed.code})`)

    await db
      .insert(classMembership)
      .values({
        id: `seed-cm-${classId}-${owner.id}`,
        classId,
        userId: owner.id,
        role: "teacher" as const,
      })
      .onConflictDoNothing()

    await db
      .insert(classMembership)
      .values(
        seed.roster.map((studentIndex) => ({
          id: `seed-cm-${classId}-${students[studentIndex].id}`,
          classId,
          userId: students[studentIndex].id,
          role: "student" as const,
        })),
      )
      .onConflictDoNothing()
  }

  await mkdir(OUTPUT_DIR, { recursive: true })
  let createdResources = 0
  let embeddedResources = 0
  for (const seed of RESOURCES) {
    const filePath = path.join(OUTPUT_DIR, seed.fileName)
    await writeFile(filePath, seed.bytes)

    const [existing] = await db
      .select({ id: resources.id })
      .from(resources)
      .where(eq(resources.id, `seed-resource-${seed.key}`))
      .limit(1)
    let resourceId = existing?.id
    if (!resourceId) {
      const uploadedAt = new Date(Date.now() - seed.uploadedDaysAgo * 86_400_000)
      const result = await db
        .insert(resources)
        .values({
          id: `seed-resource-${seed.key}`,
          orgId: org.id,
          classId: seed.classCode ? (classIdByCode.get(seed.classCode) ?? null) : null,
          title: seed.title,
          description: seed.description,
          category: seed.resourceType,
          resourceType: seed.resourceType,
          fileUrl: `/seeded-resources/${seed.fileName}`,
          fileName: seed.fileName,
          fileType: seed.fileType,
          fileSize: String(seed.bytes.length),
          storagePath: null,
          aiSourceText: seed.sourceText,
          ownerId: owner.id,
          createdAt: uploadedAt,
          updatedAt: uploadedAt,
        })
        .onConflictDoNothing()
        .returning({ id: resources.id })
      resourceId = result[0]?.id
      if (resourceId) createdResources += 1
    }

    if (!resourceId) throw new Error(`Failed to create or find resource ${seed.key}`)
    await ensureResourceChunks({ id: resourceId, orgId: org.id, aiSourceText: seed.sourceText })
    embeddedResources += 1
  }

  console.log("")
  console.log("Seed complete.")
  console.log(`  Owner:       ${OWNER_EMAIL} (signs in with Google)`)
  console.log(`  Org:         ${ORG.name} -> /${ORG_SLUG}`)
  console.log(`  Classes:     ${CLASS_SEEDS.length}`)
  console.log(`  Students:    ${STUDENT_NAMES.length}`)
  console.log(`  Resources:   ${createdResources} new (${RESOURCES.length} total)`)
  console.log(`  Embeddings:  ${embeddedResources} resources checked/backfilled`)
  console.log(`  Files:       ${OUTPUT_DIR}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
