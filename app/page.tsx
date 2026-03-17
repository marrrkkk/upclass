import { headers } from "next/headers"
import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  LayoutDashboard,
  MessageSquareMore,
  ShieldCheck,
  Sparkles,
  Users2,
  WandSparkles,
  WifiOff,
} from "lucide-react"

import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { auth } from "@/lib/auth"

const proofPoints = [
  { label: "Shared class hub", value: "One place" },
  { label: "Realtime teaching", value: "Live whiteboards" },
  { label: "Offline ready", value: "Works on weak signals" },
]

const featureCards = [
  {
    icon: BookOpen,
    title: "Classes, resources, and deadlines in one rhythm",
    description:
      "Organize course materials, assignments, and updates without scattering them across separate tools.",
  },
  {
    icon: WandSparkles,
    title: "A whiteboard that feels alive during lessons",
    description:
      "Teach visually with collaborative drawing, live updates, and a space that supports explanation in motion.",
  },
  {
    icon: MessageSquareMore,
    title: "Messaging that stays tied to the work",
    description:
      "Keep conversations close to class activity so questions, replies, and follow-ups stay actionable.",
  },
  {
    icon: WifiOff,
    title: "Built for the classroom, even when connectivity slips",
    description:
      "Offline-aware flows preserve momentum so class activity does not stop the moment the network does.",
  },
]

const workflowSteps = [
  {
    step: "01",
    title: "Set up the class space",
    description:
      "Create a class, invite students, and establish a clean home for materials, updates, and participation.",
  },
  {
    step: "02",
    title: "Teach and collaborate live",
    description:
      "Use shared whiteboards and structured class pages to keep every session focused and easy to follow.",
  },
  {
    step: "03",
    title: "Track progress without extra admin drag",
    description:
      "Surface deadlines, activity, and student touchpoints in a layout that reduces coordination overhead.",
  },
]

const trustItems = [
  "Role-aware access and protected actions",
  "Progressive web app support for mobile use",
  "Realtime collaboration backed by Supabase channels",
]

export default async function LandingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  const isAuthenticated = Boolean(session?.user)

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(77,111,255,0.16),_transparent_28%),radial-gradient(circle_at_80%_20%,_rgba(17,196,181,0.18),_transparent_24%),linear-gradient(180deg,_hsl(var(--background)),_color-mix(in_oklab,_hsl(var(--background))_92%,_hsl(var(--primary))_8%))] text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(180deg,rgba(255,255,255,0.9),transparent)]" />
      <div className="pointer-events-none absolute left-1/2 top-24 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />

      <header className="relative z-10">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-6 lg:px-8">
          <Logo
            href="/"
            size="md"
            className="gap-3"
            iconClassName="rounded-2xl border border-primary/15 bg-white/70 shadow-sm backdrop-blur dark:bg-white/10"
          />
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Button className="h-11 rounded-full px-5 shadow-lg shadow-primary/20" asChild>
                <Link href="/home">
                  Go to dashboard
                  <LayoutDashboard className="size-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" className="rounded-full px-4 text-sm" asChild>
                  <Link href="/sign-in">Log in</Link>
                </Button>
                <Button className="h-11 rounded-full px-5 shadow-lg shadow-primary/20" asChild>
                  <Link href="/sign-up">
                    Start free
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid w-full max-w-7xl gap-12 px-5 pb-16 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] lg:px-8 lg:pb-24 lg:pt-10">
          <div className="max-w-3xl">
            <div className="inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/15 bg-white/75 px-4 py-2 text-sm font-medium text-foreground shadow-sm backdrop-blur dark:bg-white/10">
              <Sparkles className="size-4 text-primary" />
              Designed for focused teaching, not software overhead
            </div>

            <h1 className="mt-6 max-w-4xl text-5xl font-black tracking-[-0.04em] text-balance sm:text-6xl lg:text-7xl">
              A calmer, smarter
              <span className="block bg-gradient-to-r from-primary via-sky-500 to-cyan-500 bg-clip-text text-transparent">
                learning command center
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
              UpClass brings teaching, collaboration, and student momentum into a single interface that feels clear in
              the moment, whether you are running a live lesson or managing the week ahead.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              {isAuthenticated ? (
                <>
                  <Button size="lg" className="h-14 rounded-full px-7 text-base shadow-xl shadow-primary/20" asChild>
                    <Link href="/home">
                      Open dashboard
                      <LayoutDashboard className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 rounded-full border-white/60 bg-white/70 px-7 text-base backdrop-blur hover:bg-white dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
                    asChild
                  >
                    <Link href="/classes">
                      Browse your classes
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button size="lg" className="h-14 rounded-full px-7 text-base shadow-xl shadow-primary/20" asChild>
                    <Link href="/sign-up">
                      Create your classroom
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 rounded-full border-white/60 bg-white/70 px-7 text-base backdrop-blur hover:bg-white dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
                    asChild
                  >
                    <Link href="/sign-in">
                      Explore your dashboard
                      <LayoutDashboard className="size-4" />
                    </Link>
                  </Button>
                </>
              )}
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {proofPoints.map((item) => (
                <div
                  key={item.label}
                  className="rounded-3xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5"
                >
                  <div className="text-lg font-semibold">{item.value}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex min-h-[520px] items-center justify-center">
            <div className="absolute left-4 top-10 hidden h-28 w-28 rounded-full bg-primary/12 blur-3xl lg:block" />
            <div className="absolute bottom-14 right-6 hidden h-36 w-36 rounded-full bg-cyan-300/20 blur-3xl lg:block" />
            <div className="absolute inset-y-10 left-1/2 hidden w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-primary/20 to-transparent lg:block" />

            <div className="relative w-full max-w-[560px]">
              <div className="relative rounded-[36px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(236,246,255,0.98))] p-6 shadow-[0_30px_100px_rgba(59,130,246,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.76),rgba(15,23,42,0.94))]">
                <div className="absolute inset-0 rounded-[36px] bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.16),transparent_30%)]" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.32em] text-primary/70">Classroom snapshot</p>
                      <h2 className="mt-3 max-w-xs text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                        One calm surface for teaching live
                      </h2>
                    </div>
                  </div>

                  <div className="mt-8 grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
                    <div className="space-y-4">
                      <div className="rounded-[28px] border border-primary/10 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/8">
                        <div className="flex items-center gap-3">
                          <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-400/12 dark:text-emerald-300">
                            <Users2 className="size-5" />
                          </div>
                          <div>
                            <div className="text-sm text-slate-500 dark:text-slate-300">Class pulse</div>
                            <div className="text-2xl font-semibold text-slate-950 dark:text-white">92% engaged</div>
                          </div>
                        </div>
                        <div className="mt-4 h-2 rounded-full bg-sky-100 dark:bg-white/10">
                          <div className="h-2 w-[92%] rounded-full bg-gradient-to-r from-primary to-cyan-400" />
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-primary/10 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/8">
                        <div className="text-sm font-medium text-slate-500 dark:text-slate-300">Today</div>
                        <div className="mt-4 space-y-3">
                          {[
                            ["Module recap", "Resources published"],
                            ["Physics whiteboard", "Live collaboration in progress"],
                            ["Assignments due", "Three checkpoints closing today"],
                          ].map(([title, subtitle]) => (
                            <div
                              key={title}
                              className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50/90 p-3 dark:border-white/10 dark:bg-white/5"
                            >
                              <div className="mt-1 size-2 rounded-full bg-primary" />
                              <div>
                                <div className="text-sm font-medium text-slate-900 dark:text-white">{title}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-[30px] border border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(219,234,254,0.92))] p-5 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]">
                      <div className="absolute inset-6 rounded-[28px] border border-dashed border-primary/15 dark:border-white/10" />
                      <div className="absolute h-56 w-56 rounded-full border border-primary/10 bg-primary/10 dark:bg-primary/10" />
                      <div className="absolute h-40 w-40 rounded-full border border-cyan-300/30" />
                      <div className="absolute h-24 w-24 rounded-full bg-gradient-to-br from-primary to-cyan-400 shadow-[0_18px_40px_rgba(59,130,246,0.34)]" />

                      <div className="absolute left-5 top-5 w-[190px] rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-lg dark:border-white/10 dark:bg-slate-900/80">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                          <WandSparkles className="size-4 text-primary" />
                          Whiteboard focus
                        </div>
                        <div className="mt-4 grid grid-cols-4 gap-2">
                          {Array.from({ length: 12 }).map((_, index) => (
                            <div
                              key={index}
                              className={`aspect-square rounded-lg ${
                                index === 2 || index === 8
                                  ? "bg-cyan-300"
                                  : index % 3 === 0
                                    ? "bg-blue-200"
                                    : "bg-sky-100 dark:bg-slate-700"
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="absolute bottom-5 right-5 w-[210px] rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-lg dark:border-white/10 dark:bg-slate-900/80">
                        <div className="text-xs uppercase tracking-[0.28em] text-primary/70">Live status</div>
                        <div className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">27 students</div>
                        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Syncing comments, board edits, and class updates</div>
                        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-cyan-50 px-3 py-2 text-sm text-sky-900 dark:bg-cyan-300/10 dark:text-cyan-50">
                          <span className="size-2 rounded-full bg-emerald-400" />
                          Everything stays in step
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-4 rounded-[32px] border border-border/60 bg-white/70 p-5 shadow-sm backdrop-blur dark:bg-white/5 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Why it feels better</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                The interface is structured around teaching flow, not software complexity.
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {featureCards.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-[28px] border border-border/60 bg-background/80 p-5 shadow-sm transition-transform duration-200 hover:-translate-y-1"
                >
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">How teams use it</p>
            <h2 className="mt-3 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
              A simple operating model for modern classrooms
            </h2>
            <p className="mt-4 max-w-lg text-base leading-8 text-muted-foreground">
              The landing page now makes the product promise clearer: establish the class, teach in realtime, and stay
              on top of student work without fragmenting the experience.
            </p>
            <div className="mt-8 rounded-[28px] border border-primary/15 bg-primary/5 p-6">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 size-5 text-primary" />
                <div>
                  <h3 className="font-semibold">Operational trust built in</h3>
                  <ul className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
                    {trustItems.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-1 size-4 shrink-0 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {workflowSteps.map((item) => (
              <div
                key={item.step}
                className="rounded-[30px] border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur transition-colors hover:border-primary/30"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="text-sm font-semibold tracking-[0.24em] text-primary">{item.step}</div>
                  <div>
                    <h3 className="text-xl font-semibold">{item.title}</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-5 pb-20 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[36px] border border-primary/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(239,246,255,0.98))] px-6 py-10 text-slate-950 shadow-[0_24px_80px_rgba(59,130,246,0.12)] sm:px-8 lg:px-10 dark:bg-slate-950 dark:text-white">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.18),transparent_58%)]" />
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Start with clarity</p>
                <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
                  Give your class a homepage that actually supports the work.
                </h2>
                <p className="mt-4 max-w-xl text-base leading-8 text-slate-600 dark:text-slate-300">
                  Launch faster, teach with fewer moving parts, and give students a clearer place to engage.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                {isAuthenticated ? (
                  <>
                    <Button size="lg" className="h-14 rounded-full px-7 shadow-lg shadow-primary/20" asChild>
                      <Link href="/home">
                        Return to dashboard
                        <LayoutDashboard className="size-4" />
                      </Link>
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-14 rounded-full border-primary/15 bg-white/70 px-7 text-slate-950 hover:bg-white dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
                      asChild
                    >
                      <Link href="/classes">Open classes</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="lg" className="h-14 rounded-full px-7 shadow-lg shadow-primary/20" asChild>
                      <Link href="/sign-up">
                        Create an account
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-14 rounded-full border-primary/15 bg-white/70 px-7 text-slate-950 hover:bg-white dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
                      asChild
                    >
                      <Link href="/sign-in">Sign in</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/50 bg-background/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Logo href="/" size="sm" />
            <span>Focused tools for classes, collaboration, and momentum.</span>
          </div>
          <div>© {new Date().getFullYear()} UpClass</div>
        </div>
      </footer>
    </div>
  )
}
