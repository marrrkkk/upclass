import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BookOpen, Users, BarChart, CheckCircle, ArrowRight } from "lucide-react"
import { UploadTest } from "@/components/UploadTest"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 md:px-6 flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <BookOpen className="h-6 w-6" />
            <span>UpClass</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="#features" className="hover:text-primary transition-colors">
              Features
            </Link>
            <Link href="#testimonials" className="hover:text-primary transition-colors">
              Testimonials
            </Link>
            <Link href="#pricing" className="hover:text-primary transition-colors">
              Pricing
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="relative overflow-hidden py-20 md:py-32 bg-gradient-to-b from-background to-blue-50/50 dark:to-blue-950/20">
          <div className="container mx-auto px-4 md:px-6 relative z-10 flex flex-col items-center text-center">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-8">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
              The Future of Learning Management
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl max-w-4xl text-foreground mb-6">
              Elevate your <span className="text-primary">Classroom</span> Experience
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground mb-10 leading-relaxed">
              UpClass provides the tools you need to manage courses, engage students, and track progress—all in one intuitive platform. Join the revolution in education technology today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link href="/sign-up">
                <Button size="lg" className="w-full sm:w-auto gap-2 text-base">
                  Start Teaching for Free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-base">
                  Explore Features
                </Button>
              </Link>
            </div>
          </div>
          {/* Abstract Background Elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-10" />
        </section>

        {/* UploadThing Test Section - Remove this after testing */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <UploadTest />
          </div>
        </section>

        <section id="features" className="py-20 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Everything you need to succeed</h2>
              <p className="text-muted-foreground text-lg">
                Powerful features designed for educators, administrators, and students alike.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="rounded-xl border bg-card p-8 shadow-sm transition-all hover:shadow-md hover:border-primary/20">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Course Management</h3>
                <p className="text-muted-foreground">
                  Create, organize, and distribute course materials with ease. deeply integrated with modern tools.
                </p>
              </div>
              <div className="rounded-xl border bg-card p-8 shadow-sm transition-all hover:shadow-md hover:border-primary/20">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Student Engagement</h3>
                <p className="text-muted-foreground">
                  Foster a collaborative learning environment with discussions, groups, and interactive assignments.
                </p>
              </div>
              <div className="rounded-xl border bg-card p-8 shadow-sm transition-all hover:shadow-md hover:border-primary/20">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BarChart className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Analytics & Insights</h3>
                <p className="text-muted-foreground">
                  Track performance with detailed analytics. Identify at-risk students and improve outcomes.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
                  Simplify your workflow
                </h2>
                <div className="space-y-4">
                  {[
                    "Intuitive drag-and-drop course builder",
                    "Automated grading and feedback tools",
                    "Real-time student progress tracking",
                    "Seamless integration with popular apps",
                    "Mobile-friendly interface for learning on the go",
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-lg">{feature}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-8">
                  <Button size="lg">See How It Works</Button>
                </div>
              </div>
              <div className="relative rounded-2xl border bg-background p-2 shadow-xl">
                <div className="aspect-video rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10"></div>
                  <div className="text-muted-foreground font-medium">Dashboard Preview</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6 text-white">Ready to transform your classroom?</h2>
            <p className="text-blue-100 text-lg mb-10 max-w-2xl mx-auto">
              Join thousands of educators who are already using UpClass to deliver better learning experiences.
            </p>
            <Link href="/sign-up">
              <Button size="lg" variant="secondary" className="text-primary font-bold text-lg px-8 h-14">
                Get Started for Free
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <footer className="border-t py-12 bg-background">
        <div className="container mx-auto px-4 md:px-6 grid gap-8 md:grid-cols-4">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 font-bold text-xl text-primary mb-4">
              <BookOpen className="h-6 w-6" />
              <span>UpClass</span>
            </div>
            <p className="text-muted-foreground max-w-xs">
              Empowering educators and students with the next generation of learning management tools.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Platform</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-primary">Features</Link></li>
              <li><Link href="#" className="hover:text-primary">Pricing</Link></li>
              <li><Link href="#" className="hover:text-primary">Enterprise</Link></li>
              <li><Link href="#" className="hover:text-primary">Changelog</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-primary">About Us</Link></li>
              <li><Link href="#" className="hover:text-primary">Careers</Link></li>
              <li><Link href="#" className="hover:text-primary">Blog</Link></li>
              <li><Link href="#" className="hover:text-primary">Contact</Link></li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 md:px-6 mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} UpClass Inc. All rights reserved.
        </div>
      </footer>
    </div>
  )
}