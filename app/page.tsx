import { headers } from "next/headers"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, BookOpen, Users, BarChart, CheckCircle, Sparkles } from "lucide-react"
import { auth } from "@/lib/auth"

export default async function LandingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  const isLoggedIn = !!session?.user?.id

  return (
    <div className="flex min-h-screen flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto px-4 md:px-6 flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight text-foreground hover:opacity-80 transition-opacity">
            <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
              <ArrowUpRight className="h-6 w-6" strokeWidth={3} />
            </div>
            <span>UpClass</span>
          </Link>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <Link href="/home">
                  <Button variant="outline" size="sm" className="cursor-pointer">
                    Home
                  </Button>
                </Link>
                <Link href="/sign-in">
                  <Button size="sm" className="cursor-pointer">
                    Sign in
                  </Button>
                </Link>
              </>
            ) : (
              <Link href="/sign-in">
                <Button size="sm" className="cursor-pointer">
                  Sign in
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - Single Section */}
      <main className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] opacity-60" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] opacity-40" />
        </div>

        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Column - Content */}
              <div className="text-center lg:text-left space-y-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium mb-4">
                  <Sparkles className="h-4 w-4" />
                  <span>The Future of Learning Management</span>
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
                  Elevate your{" "}
                  <span className="text-primary">Classroom</span> Experience
                </h1>

                <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
                  UpClass provides the tools you need to manage courses, engage students, and track progress—all in one intuitive platform.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  {isLoggedIn ? (
                    <Link href="/home">
                      <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base cursor-pointer">
                        Go to Dashboard
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/sign-in">
                      <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base cursor-pointer">
                        Get Started
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>

                {/* Feature Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8">
                  <div className="flex flex-col items-center lg:items-start gap-2">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-foreground">Course Management</h3>
                    <p className="text-sm text-muted-foreground text-center lg:text-left">
                      Organize and distribute materials with ease
                    </p>
                  </div>

                  <div className="flex flex-col items-center lg:items-start gap-2">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                      <Users className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-foreground">Student Engagement</h3>
                    <p className="text-sm text-muted-foreground text-center lg:text-left">
                      Foster collaborative learning environments
                    </p>
                  </div>

                  <div className="flex flex-col items-center lg:items-start gap-2">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                      <BarChart className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-foreground">Analytics & Insights</h3>
                    <p className="text-sm text-muted-foreground text-center lg:text-left">
                      Track performance with detailed analytics
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column - Visual */}
              <div className="relative hidden lg:block">
                <div className="relative rounded-2xl border border-border bg-card p-6 shadow-xl">
                  <div className="aspect-[4/3] rounded-xl bg-muted/30 overflow-hidden flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
                    {/* Dashboard Preview */}
                    <div className="w-full h-full bg-background rounded-lg shadow-sm border border-border/50 p-6 flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <ArrowUpRight className="h-5 w-5 text-primary" strokeWidth={3} />
                        </div>
                        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                      </div>
                      <div className="grid grid-cols-2 gap-3 flex-1">
                        <div className="bg-primary/5 rounded-lg border border-primary/10 p-4 flex flex-col gap-2">
                          <div className="h-3 w-20 bg-primary/20 rounded" />
                          <div className="h-8 w-full bg-primary/10 rounded" />
                        </div>
                        <div className="bg-muted/50 rounded-lg p-4 flex flex-col gap-2">
                          <div className="h-3 w-16 bg-muted-foreground/20 rounded" />
                          <div className="h-8 w-full bg-muted rounded" />
                        </div>
                      </div>
                      <div className="flex-1 bg-muted/30 rounded-lg border border-border/50 p-4">
                        <div className="h-full bg-background rounded flex items-center justify-center">
                          <div className="text-center space-y-2">
                            <BookOpen className="h-8 w-8 text-primary mx-auto opacity-50" />
                            <div className="h-2 w-24 bg-muted rounded mx-auto" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Decorative Elements */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-xl" />
                <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
