import "dotenv/config"
import { eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import {
  user, organizations, orgMembership, classes, classMembership,
  announcements, classwork, resources, notifications,
} from "@/db/schema"

const email = "definitelynotmark13@gmail.com"
const id = () => crypto.randomUUID()

const classSeeds = [
  { code: "SEED101", title: "Foundations of Learning", category: "General", color: "#0e6b52", schedule: "Mon, Wed 9:00 AM" },
  { code: "MATH204", title: "Applied Mathematics", category: "Mathematics", color: "#2563eb", schedule: "Tue, Thu 10:30 AM" },
  { code: "SCI110", title: "Introduction to Science", category: "Science", color: "#7c3aed", schedule: "Mon, Fri 1:00 PM" },
  { code: "ENG215", title: "Academic Writing", category: "English", color: "#c2410c", schedule: "Wed 2:30 PM" },
]

const studentSeeds = [
  ["Ariana Santos", "ariana.santos@upclass.demo"],
  ["Miguel Reyes", "miguel.reyes@upclass.demo"],
  ["Sofia Garcia", "sofia.garcia@upclass.demo"],
  ["Lucas Mendoza", "lucas.mendoza@upclass.demo"],
  ["Isabella Cruz", "isabella.cruz@upclass.demo"],
  ["Gabriel Flores", "gabriel.flores@upclass.demo"],
  ["Chloe Navarro", "chloe.navarro@upclass.demo"],
  ["Ethan Ramos", "ethan.ramos@upclass.demo"],
] as const

async function main() {
  const target = (await db.select().from(user).where(eq(user.email, email)).limit(1))[0]
  if (!target) throw new Error(`User ${email} does not exist. Sign in once first so Better Auth creates the user row.`)

  const orgSlug = "demo-classroom"
  let org = (await db.select().from(organizations).where(eq(organizations.slug, orgSlug)).limit(1))[0]
  if (!org) {
    org = { id: id(), name: "Demo Classroom", slug: orgSlug, description: "Seeded demo organization", createdBy: target.id } as typeof org
    await db.insert(organizations).values(org)
  }
  await db.insert(orgMembership).values({ id: id(), orgId: org.id, userId: target.id, role: "owner" }).onConflictDoNothing()

  await db.insert(user).values(studentSeeds.map(([name, studentEmail]) => ({
    id: `seed-student-${studentEmail.split("@")[0]}`,
    name,
    email: studentEmail,
    emailVerified: true,
    bio: "Demo student account",
  }))).onConflictDoNothing()

  const students = await db.select().from(user).where(inArray(user.email, studentSeeds.map(([, studentEmail]) => studentEmail)))
  await db.insert(orgMembership).values(students.map((student) => ({
    id: `seed-org-member-${student.id}`,
    orgId: org.id,
    userId: student.id,
    role: "member" as const,
  }))).onConflictDoNothing()

  for (const seed of classSeeds) {
    let cls = (await db.select().from(classes).where(eq(classes.code, seed.code)).limit(1))[0]
    if (!cls) {
      cls = {
        id: `seed-class-${seed.code.toLowerCase()}`,
        orgId: org.id,
        ...seed,
        description: `Seeded ${seed.category.toLowerCase()} class for exploring Upclass.`,
        ownerId: target.id,
      } as typeof cls
      await db.insert(classes).values(cls)
    }

    await db.insert(classMembership).values({
      id: `seed-teacher-${cls.id}-${target.id}`,
      classId: cls.id,
      userId: target.id,
      role: "teacher",
    }).onConflictDoNothing()

    await db.insert(classMembership).values(students.map((student) => ({
      id: `seed-student-membership-${cls.id}-${student.id}`,
      classId: cls.id,
      userId: student.id,
      role: "student" as const,
    }))).onConflictDoNothing()
  }

  const cls = (await db.select().from(classes).where(eq(classes.code, "SEED101")).limit(1))[0]
  if (!cls) throw new Error("Failed to create the primary seeded class")

  const annId = `seed-announcement-${target.id}`
  await db.insert(announcements).values({ id: annId, classId: cls.id, authorId: target.id, content: "Welcome to your seeded Upclass classroom. Check the classwork and resources tabs to get started." }).onConflictDoNothing()
  const workId = `seed-classwork-${target.id}`
  await db.insert(classwork).values({ id: workId, classId: cls.id, type: "assignment", title: "Build your learning plan", description: "Write three goals for this term and one action for each.", dueDate: new Date(Date.now() + 7 * 86400000), points: "20" }).onConflictDoNothing()
  await db.insert(resources).values({ id: `seed-resource-${target.id}`, orgId: org.id, title: "Getting Started Guide", description: "A short guide to navigating your classroom.", fileType: "pdf", fileName: "getting-started.pdf", ownerId: target.id, fileUrl: "https://example.com/getting-started" }).onConflictDoNothing()
  await db.insert(notifications).values({ id: `seed-notification-${target.id}`, userId: target.id, type: "announcement", title: "Welcome to Demo Classroom", message: "Your seeded classroom is ready.", classId: cls.id, relatedId: annId, read: false }).onConflictDoNothing()
  console.log(`Seeded ${email}: org=${org.slug}, classes=${classSeeds.length}, students=${students.length}`)
}

main().catch((error) => { console.error(error); process.exitCode = 1 })




