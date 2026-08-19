import { headers } from "next/headers"
import Link from "next/link"
import type { Metadata } from "next"
import { cache, Suspense } from "react"
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileQuestion,
  FileStack,
  LayoutDashboard,
  MessageSquare,
  MessageSquareMore,
  PenLine,
  PencilRuler,
  Sparkles,
  Users,
  WifiOff,
  Zap,
} from "lucide-react"

import { Logo } from "@/components/logo"
import { JsonLd } from "@/components/seo/json-ld"
import { Button } from "@/components/ui/button"
import { IconBadge } from "@/components/ui/icon-badge"
import { Panel } from "@/components/ui/panel"
import { PageContainer } from "@/components/ui/section"
import { StatusBadge } from "@/components/ui/status-badge"
import { Text } from "@/components/ui/typography"
import { auth } from "@/lib/auth"
import {
  defaultDescription,
  organizationSchema,
  websiteSchema,
  webApplicationSchema,
} from "@/lib/seo"

const landingDescription =
  "A modern learning management system for schools and teachers. Manage courses, communicate with students, create interactive whiteboards, and track progress—all in one focused workspace."

const featureChapters = [
  {
    icon: FileStack,
    eyebrow: "One class, one source of truth",
    title: "Everything your class needs has a place.",
    description:
      "Materials, announcements, coursework, and quiz work stay connected to the class instead of spreading across disconnected tools.",
    points: ["A focused course home", "Clear work and submission states", "Files that stay with the lesson"],
    accent: "signal-blue" as const,
  },
  {
    icon: PenLine,
    eyebrow: "Explain ideas together",
    title: "Turn the lesson into a shared working space.",
    description:
      "Use collaborative whiteboards for the moments that need a sketch, a worked example, or a quick idea from every learner.",
    points: ["Live collaborative boards", "A calm space for visual thinking", "Built for teaching, not meetings"],
    accent: "marigold" as const,
  },
  {
    icon: WifiOff,
    eyebrow: "Keep moving through real life",
    title: "Learning work that respects imperfect connections.",
    description:
      "Offline-aware caching and queued actions help classrooms stay productive when the network is not keeping up.",
    points: ["Offline-aware class access", "Queued supported actions", "A progressive web app for every device"],
    accent: "midnight-ink" as const,
  },
  {
    icon: Sparkles,
    eyebrow: "Grounded intelligence",
    title: "AI teaching assistance that respects lesson context.",
    description:
      "Draft comprehensive quizzes from uploaded course materials and allow students to ask questions grounded directly in authoritative class resources.",
    points: ["Context-grounded resource chat", "AI quiz draft generation", "Teacher-verified scoring"],
    accent: "sky-wash" as const,
  },
] as const

const spotlightTools = [
  {
    icon: PencilRuler,
    tone: "info" as const,
    title: "Collaborative Whiteboards",
    description: "Realtime Excalidraw-powered canvas built directly into every course. Sketch diagrams, solve equations, and let learners collaborate visually.",
    badge: "Built-in canvas",
  },
  {
    icon: FileQuestion,
    tone: "warning" as const,
    title: "Quizzes & Instant Grading",
    description: "Create multiple-choice and short-answer assessments with automated scoring, time limits, and revision tracking for deep learning insight.",
    badge: "Assessments",
  },
  {
    icon: MessageSquare,
    tone: "primary" as const,
    title: "Class Channels & Direct Chat",
    description: "Keep academic conversations organized with course general channels, direct messaging, instant presence indicators, and rich attachment sharing.",
    badge: "Communication",
  },
  {
    icon: Zap,
    tone: "success" as const,
    title: "Zero-Lag Instant Navigation",
    description: "Instant skeleton transitions on route clicks paired with service-worker prefetching ensure a lightning-fast experience on laptops and phones.",
    badge: "PWA Powered",
  },
] as const

const workflow = [
  {
    step: "01",
    title: "Set up the room",
    description: "Create a class, invite your people, and give every course a clear home.",
  },
  {
    step: "02",
    title: "Make the work visible",
    description: "Share materials, post coursework, and keep questions close to the learning.",
  },
  {
    step: "03",
    title: "See what needs you",
    description: "Follow deadlines, submissions, activity, and the next useful teaching move.",
  },
] as const

export const metadata: Metadata = {
  title: "Learning Management System for Schools & Teachers | UpClass",
  description: landingDescription,
  alternates: { canonical: "/" },
  openGraph: {
    title: "UpClass | Learning Management System for Schools & Teachers",
    description: landingDescription,
    url: "/",
  },
  twitter: {
    title: "UpClass | Learning Management System for Schools & Teachers",
    description: landingDescription,
  },
}

const getIsAuthenticated = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() })
  return Boolean(session?.user)
})

async function HeaderActions() {
  const isAuthenticated = await getIsAuthenticated()
  if (isAuthenticated) {
    return (
      <Button size="sm" asChild>
        <Link href="/org">
          Open workspace <LayoutDashboard aria-hidden="true" className="size-3.5" />
        </Link>
      </Button>
    )
  }
  return <SignedOutHeaderActions />
}

function SignedOutHeaderActions() {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/sign-in">Log in</Link>
      </Button>
      <Button size="sm" asChild>
        <Link href="/sign-up">Get started</Link>
      </Button>
    </div>
  )
}

async function HeroActions() {
  const isAuthenticated = await getIsAuthenticated()
  if (isAuthenticated) {
    return (
      <>
        <Button size="lg" asChild>
          <Link href="/org">
            Open workspace <LayoutDashboard aria-hidden="true" className="size-4" />
          </Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/org">
            Browse classes <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      </>
    )
  }
  return <SignedOutHeroActions />
}

function SignedOutHeroActions() {
  return (
    <>
      <Button size="lg" asChild>
        <Link href="/sign-up">
          Build your class space <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </Button>
      <Button size="lg" variant="outline" asChild>
        <Link href="/sign-in">Sign in</Link>
      </Button>
    </>
  )
}

async function CtaActions() {
  const isAuthenticated = await getIsAuthenticated()
  if (isAuthenticated) {
    return (
      <Button size="lg" asChild>
        <Link href="/org">
          Return to your workspace <LayoutDashboard aria-hidden="true" className="size-4" />
        </Link>
      </Button>
    )
  }
  return (
    <Button size="lg" asChild>
      <Link href="/sign-up">
        Start building for free <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </Button>
  )
}

function LandingBrand() {
  return <Logo href="/" className="landing-brand" textClassName="landing-brand-name" />
}

function WorkspacePreview() {
  return (
    <Panel padding="none" variant="raised" className="landing-workspace overflow-hidden" aria-label="UpClass workspace preview">
      <div className="flex items-center justify-between border-b border-hairline bg-surface px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-destructive/80" aria-hidden="true" />
          <span className="size-2.5 rounded-full bg-warning/80" aria-hidden="true" />
          <span className="size-2.5 rounded-full bg-success/80" aria-hidden="true" />
        </div>
        <div className="flex max-w-xs flex-1 items-center justify-center rounded-md border border-hairline bg-card px-3 py-1 text-center type-caption text-muted-foreground">
          <span className="truncate">upclass.app/springfield/classes/bio-101</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <StatusBadge tone="success" size="sm" dot>Connected</StatusBadge>
        </div>
      </div>

      <div className="grid min-h-[30rem] grid-cols-1 md:grid-cols-[13.5rem_minmax(0,1fr)]">
        <aside className="hidden border-r border-hairline bg-surface p-4 md:block">
          <div className="mb-5 flex items-center gap-2">
            <IconBadge tone="primary" size="sm" variant="solid"><BookOpen /></IconBadge>
            <div>
              <Text variant="h4">Springfield High</Text>
              <Text variant="caption" tone="muted">Teaching workspace</Text>
            </div>
          </div>

          <div className="space-y-1">
            {[
              { label: "Home", active: false },
              { label: "Activity", active: false },
              { label: "Classes", active: true },
              { label: "Messages", active: false, badge: "2" },
              { label: "Resources", active: false },
            ].map((item) => (
              <div
                key={item.label}
                className={`flex items-center justify-between rounded-md px-3 py-2 type-caption font-medium transition-colors ${
                  item.active
                    ? "bg-primary-surface text-primary-text"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`size-1.5 rounded-full ${item.active ? "bg-primary-strong" : "bg-muted-foreground/30"}`} />
                  {item.label}
                </span>
                {item.badge ? (
                  <span className="rounded bg-primary px-1.5 py-0.5 type-overline font-semibold text-primary-text">
                    {item.badge}
                  </span>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-7 space-y-2 border-t border-hairline pt-4">
            <Text variant="overline" tone="muted" className="px-2.5">YOUR CLASSES</Text>
            {[
              { name: "Biology 101", color: "bg-course-1", students: "28 enrolled" },
              { name: "World Literature", color: "bg-course-3", students: "22 enrolled" },
              { name: "AP Chemistry", color: "bg-course-2", students: "19 enrolled" },
            ].map((course, index) => (
              <div
                key={course.name}
                className={`flex items-center justify-between rounded-md px-2.5 py-1.5 type-caption transition-colors ${
                  index === 0 ? "bg-muted/70 text-foreground font-medium" : "text-muted-foreground"
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <span className={`size-2 shrink-0 rounded-sm ${course.color}`} />
                  <span className="truncate">{course.name}</span>
                </span>
              </div>
            ))}
          </div>
        </aside>

        <div className="min-w-0 bg-card p-4 sm:p-6 lg:p-7">
          <div className="rounded-xl border border-hairline bg-primary-surface/50 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3.5">
                <span className="mt-0.5 size-10 shrink-0 rounded-xl bg-course-1 shadow-e1" aria-hidden="true" />
                <div className="min-w-0 space-y-1">
                  <Text variant="overline" tone="primary" className="font-semibold">
                    COURSE WORKSPACE
                  </Text>
                  <Text variant="h1" className="truncate">Biology 101</Text>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Text variant="caption" tone="muted">Science</Text>
                    <Text variant="caption" tone="muted">·</Text>
                    <Text variant="caption" tone="muted">Tue &amp; Thu 10:00 AM</Text>
                    <Text variant="caption" tone="muted">·</Text>
                    <Text variant="caption" tone="muted" className="numeric-tabular">28 enrolled</Text>
                  </div>
                </div>
              </div>
              <StatusBadge tone="primary">Teaching</StatusBadge>
            </div>
          </div>

          <div className="mt-5 flex min-w-0 gap-6 overflow-x-auto border-b border-hairline px-1">
            {[
              { label: "Stream", active: true },
              { label: "Classwork", active: false },
              { label: "Quizzes", active: false },
              { label: "People", active: false },
              { label: "Whiteboard", active: false },
            ].map((tab) => (
              <div
                key={tab.label}
                className={`shrink-0 border-b-2 pb-2.5 type-small font-medium transition-colors ${
                  tab.active
                    ? "border-primary-strong text-primary-text"
                    : "border-transparent text-muted-foreground"
                }`}
              >
                {tab.label}
              </div>
            ))}
          </div>

          <div className="mt-5 max-w-3xl space-y-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <Text variant="h3">Stream</Text>
                <Text variant="caption" tone="muted">Announcements and updates for this course.</Text>
              </div>
              <StatusBadge tone="success" dot>Live updates</StatusBadge>
            </div>

            <div className="rounded-lg border border-dashed border-hairline-strong bg-surface-sunken/60 p-3.5 transition-colors">
              <div className="flex items-center gap-3">
                <IconBadge tone="primary" size="sm"><PenLine /></IconBadge>
                <Text variant="small" tone="muted" className="truncate">Share an update with Biology 101…</Text>
              </div>
            </div>

            <article className="rounded-xl border border-hairline bg-card p-4 shadow-e1">
              <div className="flex items-start gap-3.5">
                <IconBadge tone="info" size="md"><MessageSquareMore /></IconBadge>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Text variant="h4">Dr. Sarah Patel</Text>
                      <StatusBadge tone="info" size="sm">Instructor</StatusBadge>
                    </div>
                    <Text variant="caption" tone="subtle">Today · 9:12 AM</Text>
                  </div>
                  <Text variant="body" tone="default" className="leading-relaxed">
                    Lab groups have been posted for the cellular respiration experiment. Please review the attached protocol and bring your completed pre-lab diagrams to Thursday&apos;s class session.
                  </Text>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge tone="neutral">👍 14</StatusBadge>
                      <StatusBadge tone="neutral">🔬 8</StatusBadge>
                      <StatusBadge tone="neutral">3 reactions</StatusBadge>
                    </div>
                    <Text variant="caption" tone="subtle">12 replies in discussion</Text>
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-xl border border-hairline bg-card p-4 shadow-e1">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <IconBadge tone="warning" size="md"><ClipboardCheck /></IconBadge>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Text variant="h4">Cell diagram response</Text>
                      <StatusBadge tone="warning" dot>Due soon</StatusBadge>
                    </div>
                    <Text variant="caption" tone="muted">
                      Assignment · Due tomorrow at 11:59 PM · 10 points
                    </Text>
                    <Text variant="small" tone="muted">
                      Upload your digital canvas export or photo of your handwritten membrane structure.
                    </Text>
                  </div>
                </div>
                <div className="hidden shrink-0 sm:block">
                  <StatusBadge tone="neutral">24/28 submitted</StatusBadge>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </Panel>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-dvh overflow-hidden bg-background text-foreground">
      <JsonLd data={[websiteSchema, organizationSchema, { ...webApplicationSchema, description: defaultDescription }]} />

      <header className="landing-nav sticky top-0 z-50 border-b border-hairline bg-background/90 backdrop-blur-md">
        <PageContainer width="canvas" className="relative flex h-16 flex-row items-center justify-between space-y-0 px-4 sm:px-6 lg:px-8">
          <LandingBrand />

          <nav aria-label="Primary" className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
            {[
              { href: "#workspace", label: "Product" },
              { href: "#features", label: "How it helps" },
              { href: "#tools", label: "Classroom tools" },
              { href: "#how-it-works", label: "Start here" },
            ].map((item) => (
              <Link key={item.href} className="landing-nav-link focus-ring" href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/contact" className="landing-nav-link hidden sm:inline-flex">
              Support
            </Link>
            <Suspense fallback={<SignedOutHeaderActions />}>
              <HeaderActions />
            </Suspense>
          </div>
        </PageContainer>
      </header>

      <main>
        <section id="workspace" className="landing-hero-section border-b border-hairline">

          <PageContainer width="canvas" className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
            <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
              <div className="landing-fade-up mb-5 inline-flex items-center gap-2 border-l-2 border-primary pl-3 type-small font-medium text-primary-text">
                Built for the daily work of teaching and learning
              </div>

              {/* Display headline with highlight pill (DESIGN.MD: colored pill behind key word) */}
              <h1 className="landing-hero-title landing-fade-up-delay-1 text-balance font-display font-semibold">
                Teaching made{" "}
                <span className="landing-hero-accent text-primary-text">
                  simple.
                </span>
                <span className="block mt-2">Learning made better.</span>
              </h1>

              {/* Serif subhead (DESIGN.MD: Lyon Text / Source Serif for editorial moments) */}
              <Text variant="bodyLg" tone="muted" className="landing-fade-up-delay-2 mt-7 max-w-2xl text-balance leading-relaxed">
                A unified classroom learning app for planning courses, sharing coursework, collaborating on live whiteboards, and keeping work moving — even when connections fail.
              </Text>

              {/* CTA buttons */}
              <div className="landing-fade-up-delay-3 mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                <Suspense fallback={<SignedOutHeroActions />}>
                  <HeroActions />
                </Suspense>
              </div>

              {/* Feature pills */}
              <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-muted-foreground landing-fade-in-delay">
                <span className="flex items-center gap-1.5 type-caption font-medium">
                  <CheckCircle2 className="size-3.5 text-primary-strong" aria-hidden="true" />
                  Tenant-scoped organizations
                </span>
                <span className="flex items-center gap-1.5 type-caption font-medium">
                  <CheckCircle2 className="size-3.5 text-primary-strong" aria-hidden="true" />
                  Realtime Excalidraw whiteboards
                </span>
                <span className="flex items-center gap-1.5 type-caption font-medium">
                  <CheckCircle2 className="size-3.5 text-primary-strong" aria-hidden="true" />
                  Offline-ready PWA
                </span>
              </div>
            </div>

            {/* Product mockup (DESIGN.MD: product UI screenshot with drop-shadow) */}
            <div className="mx-auto mt-16 max-w-6xl sm:mt-20">
              <WorkspacePreview />
            </div>
          </PageContainer>
        </section>

        {/* Features section with accent card backgrounds (DESIGN.MD: colored panels) */}
        <section id="features" className="border-b border-hairline bg-surface py-20 sm:py-24 lg:py-32">
          <PageContainer width="canvas" className="px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
              <div className="max-w-md space-y-5 lg:sticky lg:top-24 lg:self-start">
                <Text variant="overline" tone="primary" className="font-semibold">
                  BUILT AROUND THE WORK OF A CLASS
                </Text>
                <Text variant="h1" as="h2" className="text-balance font-semibold">
                  Everything around a lesson, in one place.
                </Text>
                <Text variant="body" tone="muted" className="leading-relaxed">
                  A classroom does not need more dashboards. It needs a shared record of the work, the conversation, and the next step.
                </Text>
                <div className="pt-3">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/sign-up">
                      Explore course features <ArrowRight aria-hidden="true" className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Feature cards with accent backgrounds (DESIGN.MD: flat colored fills) */}
              <div className="space-y-6">
                {featureChapters.map((feature) => (
                  <article
                    key={feature.title}
                    className="rounded-xl border border-hairline bg-card p-6 shadow-e1 transition-shadow hover:shadow-e2 sm:p-8"
                  >
                    <div className="flex items-start gap-5">
                      <div
                        className="mt-1 flex size-12 shrink-0 items-center justify-center rounded-lg border border-hairline bg-primary-surface text-primary-text"
                      >
                        <feature.icon
                          className="size-6"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-3.5">
                        <Text
                          variant="caption"
                          tone="primary"
                          className="font-medium"
                        >
                          {feature.eyebrow}
                        </Text>
                        <Text
                          variant="h2"
                          as="h3"
                          className="font-semibold"
                        >
                          {feature.title}
                        </Text>
                        <Text
                          variant="body"
                          className="leading-relaxed"
                        >
                          {feature.description}
                        </Text>
                        <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
                          {feature.points.map((point) => (
                            <Text
                              key={point}
                              variant="caption"
                              className="flex items-center gap-1.5 font-medium text-muted-foreground"
                            >
                              <Check
                                className="size-3.5 text-primary-strong"
                                aria-hidden="true"
                              />
                              {point}
                            </Text>
                          ))}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </PageContainer>
        </section>

        {/* Tools section with white cards (DESIGN.MD: white cards on warm canvas with hairlines) */}
        <section id="tools" className="border-b border-hairline bg-background py-20 sm:py-24 lg:py-32">
          <PageContainer width="canvas" className="px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <Text variant="overline" tone="primary" className="font-semibold">
                COMPREHENSIVE CLASSROOM TOOLKIT
              </Text>
              <Text variant="h1" as="h2" className="mt-4 text-balance font-semibold">
                Built specifically for teaching and learning.
              </Text>
              <Text variant="bodyLg" tone="muted" className="mt-5 text-balance">
                Every feature in UpClass is designed around real school workflows, eliminating context switching between separate tools.
              </Text>
            </div>

            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {spotlightTools.map((tool) => (
                <Panel
                  key={tool.title}
                  padding="none"
                  className="group flex flex-col overflow-hidden transition-all duration-200 hover:border-hairline-strong hover:shadow-e2"
                >
                  <div className="flex flex-1 flex-col space-y-4 p-6">
                    <div className="flex items-center justify-between gap-2">
                      <IconBadge tone={tool.tone} size="md">
                        <tool.icon />
                      </IconBadge>
                      <StatusBadge tone={tool.tone} size="sm">
                        {tool.badge}
                      </StatusBadge>
                    </div>
                    <Text variant="h3" className="font-semibold">
                      {tool.title}
                    </Text>
                    <Text variant="small" tone="muted" className="leading-relaxed">
                      {tool.description}
                    </Text>
                  </div>
                  <div className="border-t border-hairline bg-surface-sunken/40 px-6 py-3.5 text-right">
                    <Text
                      variant="caption"
                      tone="primary"
                      className="inline-flex items-center gap-1.5 font-medium transition-all group-hover:gap-2"
                    >
                      Learn more <ArrowRight className="size-3" aria-hidden="true" />
                    </Text>
                  </div>
                </Panel>
              ))}
            </div>
          </PageContainer>
        </section>

        {/* Workflow section */}
        <section id="how-it-works" className="border-b border-hairline bg-surface py-20 sm:py-24 lg:py-32">
          <PageContainer width="canvas" className="px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <Text variant="overline" tone="primary" className="font-semibold">
                A GENTLER CLASSROOM RHYTHM
              </Text>
              <Text variant="h1" as="h2" className="mt-4 text-balance font-semibold">
                Start small. Keep the work clear.
              </Text>
              <Text variant="bodyLg" tone="muted" className="mt-5 text-balance">
                From the first class to the next deadline, UpClass keeps the routine simple enough to use every day.
              </Text>
            </div>

            <ol className="mt-16 grid gap-8 lg:grid-cols-3 lg:gap-10">
              {workflow.map((item) => (
                <li key={item.step} className="rounded-xl border border-hairline bg-card p-7 shadow-e1">
                  <Text variant="display" tone="primary" className="landing-step-number font-display font-semibold">
                    {item.step}
                  </Text>
                  <div className="mt-6 space-y-2.5">
                    <Text variant="h2" as="h3" className="font-semibold">
                      {item.title}
                    </Text>
                    <Text variant="body" tone="muted" className="leading-relaxed">
                      {item.description}
                    </Text>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-14 flex justify-center">
              <Button variant="outline" asChild>
                <Link href="/sign-up">
                  See your workspace <ArrowUpRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
            </div>
          </PageContainer>
        </section>

        {/* Final CTA with accent background */}
        <section className="bg-primary-surface/50 py-20 sm:py-24 lg:py-32">
          <PageContainer width="content" className="px-4 text-center sm:px-6">
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
              <IconBadge tone="primary" size="lg" variant="solid">
                <Users />
              </IconBadge>
              <Text variant="overline" tone="primary" className="font-semibold">
                MAKE ROOM FOR BETTER TEACHING
              </Text>
              <Text variant="display" as="h2" className="text-balance font-display font-semibold">
                Your classroom already has enough moving parts.
              </Text>
              <Text variant="bodyLg" tone="muted" className="max-w-2xl text-balance leading-relaxed">
                Give everyone one dependable place to learn, collaborate, and keep the work moving.
              </Text>
              <div className="flex flex-col items-stretch gap-3 pt-4 sm:flex-row sm:items-center">
                <Suspense fallback={<SignedOutHeroActions />}>
                  <CtaActions />
                </Suspense>
              </div>
            </div>
          </PageContainer>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-hairline bg-surface">
        <PageContainer width="canvas" className="space-y-8 px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-sm space-y-3.5">
              <LandingBrand />
              <Text variant="small" tone="muted" className="leading-relaxed">
                A connected learning workspace for clear courses, collaborative teaching, and classrooms that keep moving.
              </Text>
            </div>
            <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-3 sm:flex sm:flex-wrap sm:gap-x-8">
              {[
                { href: "#workspace", label: "Workspace" },
                { href: "#features", label: "Features" },
                { href: "#tools", label: "Tools" },
                { href: "#how-it-works", label: "How it works" },
                { href: "/contact", label: "Support" },
                { href: "/privacy", label: "Privacy" },
                { href: "/terms", label: "Terms" },
              ].map((item) => (
                <Text key={item.href} variant="small" tone="muted" asChild>
                  <Link className="focus-ring rounded-sm transition-colors hover:text-foreground" href={item.href}>
                    {item.label}
                  </Link>
                </Text>
              ))}
            </nav>
          </div>

          <div className="flex flex-col gap-3 border-t border-hairline pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Text variant="caption" tone="subtle">
              © 2026 UpClass. All rights reserved.
            </Text>
            <Text variant="caption" tone="subtle" className="flex items-center gap-2">
              <BarChart3 className="size-3.5" aria-hidden="true" />
              Calm by design. Ready for real classroom work.
            </Text>
          </div>
        </PageContainer>
      </footer>
    </div>
  )
}
