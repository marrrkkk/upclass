import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  BookOpen,
  Users,
  BarChart,
  CheckCircle,
  ArrowRight,
  Star,
  Shield,
  Zap,
  Globe,
  Quote
} from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 md:px-6 flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary transition-opacity hover:opacity-90">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <BookOpen className="h-5 w-5" />
            </div>
            <span>UpClass</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
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
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                Log in
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" className="font-semibold shadow-sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 md:py-32 lg:py-40 bg-background">
          {/* Background Gradients */}
          <div className="absolute inset-0 z-0">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/5 rounded-[100%] blur-[100px] opacity-70 animate-in fade-in duration-1000" />
            <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-blue-500/5 rounded-[100%] blur-[120px] opacity-40" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
          </div>

          <div className="container mx-auto px-4 md:px-6 relative z-10 flex flex-col items-center text-center">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
              <Badge variant="outline" className="mb-6 px-4 py-1.5 rounded-full text-primary border-primary/20 bg-primary/5 text-sm font-medium">
                <SparklesIcon className="w-3.5 h-3.5 mr-2 inline-block" />
                The Future of Learning Management
              </Badge>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl max-w-4xl text-foreground mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
              Elevate your <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Classroom</span> Experience
            </h1>

            <p className="max-w-2xl text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
              UpClass provides the tools you need to manage courses, engage students, and track progress—all in one intuitive platform. Join the revolution in education technology today.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400">
              <Link href="/sign-up">
                <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base shadow-lg shadow-primary/20 transition-all hover:scale-105 hover:shadow-primary/30">
                  Start Teaching for Free <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 text-base bg-background/50 backdrop-blur-sm hover:bg-muted/50">
                  Explore Features
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Everything you need to succeed</h2>
              <p className="text-muted-foreground text-lg">
                Powerful features designed for educators, administrators, and students alike.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              <FeatureCard
                icon={BookOpen}
                title="Course Management"
                description="Create, organize, and distribute course materials with ease. Deeply integrated with modern tools."
              />
              <FeatureCard
                icon={Users}
                title="Student Engagement"
                description="Foster a collaborative learning environment with discussions, groups, and interactive assignments."
              />
              <FeatureCard
                icon={BarChart}
                title="Analytics & Insights"
                description="Track performance with detailed analytics. Identify at-risk students and improve outcomes."
              />
            </div>
          </div>
        </section>

        {/* Workflow Section */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="order-2 lg:order-1">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
                  Simplify your workflow
                </h2>
                <div className="space-y-6">
                  <WorkflowItem title="Intuitive drag-and-drop course builder" />
                  <WorkflowItem title="Automated grading and feedback tools" />
                  <WorkflowItem title="Real-time student progress tracking" />
                  <WorkflowItem title="Seamless integration with popular apps" />
                  <WorkflowItem title="Mobile-friendly interface for learning on the go" />
                </div>
                <div className="mt-8 pt-4">
                  <Button size="lg" variant="outline" className="gap-2">
                    See How It Works <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="order-1 lg:order-2 relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-3xl blur-2xl opacity-50" />
                <div className="relative rounded-2xl border bg-card p-2 shadow-2xl">
                  <div className="aspect-[4/3] rounded-xl bg-muted/50 overflow-hidden flex items-center justify-center relative group border border-border/50">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
                    {/* Abstract Dashboard UI */}
                    <div className="w-3/4 h-3/4 bg-background rounded-lg shadow-sm border p-4 flex flex-col gap-3">
                      <div className="h-8 w-1/3 bg-muted rounded animate-pulse" />
                      <div className="flex gap-3">
                        <div className="flex-1 h-32 bg-primary/5 rounded border border-primary/10" />
                        <div className="flex-1 h-32 bg-muted/50 rounded" />
                      </div>
                      <div className="flex-1 bg-muted/30 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-24 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Loved by Educators</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                See what teachers and students are saying about their experience with UpClass.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              <TestimonialCard
                quote="UpClass has completely transformed how I manage my classroom. The student engagement tools are a game-changer."
                author="Sarah J."
                role="High School Teacher"
              />
              <TestimonialCard
                quote="The intuitive interface makes it easy for my students to stay organized and submit assignments on time."
                author="Mark T."
                role="University Professor"
              />
              <TestimonialCard
                quote="I love the analytics features. Being able to see student progress in real-time allows me to intervene early."
                author="Emily R."
                role="Online Instructor"
              />
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Simple, Transparent Pricing</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Choose the plan that's right for your institution.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
              {/* Free Plan */}
              <PricingCard
                title="Starter"
                price="$0"
                description="Perfect for individual teachers."
                features={["Up to 2 Classes", "50 Students Max", "Basic Analytics", "5GB Storage"]}
                buttonText="Get Started"
                outline
              />
              {/* Pro Plan */}
              <PricingCard
                title="Pro"
                price="$29"
                period="/mo"
                description="For growing classrooms."
                features={["Unlimited Classes", "Unlimited Students", "Advanced Analytics", "100GB Storage", "Priority Support"]}
                buttonText="Start Free Trial"
                popular
              />
              {/* School Plan */}
              <PricingCard
                title="Institution"
                price="Custom"
                description="For schools and districts."
                features={["Unlimited Everything", "SSO Integration", "Custom Branding", "Dedicated Account Manager", "API Access"]}
                buttonText="Contact Sales"
                outline
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary z-0">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid-white.svg')] bg-[size:50px_50px] opacity-10" />
          </div>
          <div className="container mx-auto px-4 md:px-6 relative z-10 text-center text-primary-foreground">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-6 text-white">Ready to transform your classroom?</h2>
            <p className="text-blue-100 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
              Join thousands of educators who are already using UpClass to deliver better learning experiences.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/sign-up">
                <Button size="lg" variant="secondary" className="text-primary font-bold text-lg px-8 h-14 shadow-xl hover:shadow-2xl hover:scale-105 transition-all">
                  Get Started for Free
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="bg-primary-foreground/10 text-white border-white/20 hover:bg-primary-foreground/20 h-14 px-8 text-lg font-medium backdrop-blur-sm">
                  Contact Sales
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 md:py-16 bg-background">
        <div className="container mx-auto px-4 md:px-6 grid gap-12 md:grid-cols-4 lg:gap-16">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 font-bold text-xl text-primary mb-6">
              <div className="bg-primary/10 p-1.5 rounded-lg">
                <BookOpen className="h-5 w-5" />
              </div>
              <span>UpClass</span>
            </div>
            <p className="text-muted-foreground max-w-sm text-sm leading-relaxed mb-6">
              Empowering educators and students with the next generation of intuitive, powerful learning management tools.
            </p>
            <div className="flex gap-4">
              <SocialLink icon={Globe} href="#" />
              {/* Add more social links if needed */}
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-6 text-foreground">Platform</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-primary transition-colors">Features</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Pricing</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Enterprise</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Changelog</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-6 text-foreground">Company</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Careers</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Blog</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 md:px-6 mt-16 pt-8 border-t flex flex-col sm:flex-row items-center justify-between text-sm text-muted-foreground gap-4">
          <p>© {new Date().getFullYear()} UpClass Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-foreground">Privacy Policy</Link>
            <Link href="#" className="hover:text-foreground">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <div className="group relative rounded-2xl border bg-card p-8 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 hover:border-primary/20">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mb-3 text-xl font-bold text-foreground">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  )
}

function WorkflowItem({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 group">
      <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 group-hover:bg-green-500/20 transition-colors">
        <CheckCircle className="h-4 w-4 text-green-600" />
      </div>
      <span className="text-lg text-foreground/80 group-hover:text-foreground transition-colors">{title}</span>
    </div>
  )
}

function TestimonialCard({ quote, author, role }: { quote: string, author: string, role: string }) {
  return (
    <div className="rounded-2xl border bg-card p-8 shadow-sm relative">
      <Quote className="h-8 w-8 text-primary/20 absolute top-6 right-6" />
      <div className="flex gap-1 mb-4 text-amber-500">
        {[1, 2, 3, 4, 5].map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-current" />
        ))}
      </div>
      <p className="text-muted-foreground mb-6 italic relative z-10">"{quote}"</p>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">
          {author.charAt(0)}
        </div>
        <div>
          <h4 className="font-semibold text-sm">{author}</h4>
          <p className="text-xs text-muted-foreground">{role}</p>
        </div>
      </div>
    </div>
  )
}

function PricingCard({ title, price, period, description, features, buttonText, popular, outline }: any) {
  return (
    <div className={`rounded-3xl p-8 border flex flex-col h-full relative ${popular ? 'bg-background shadow-xl border-primary ring-1 ring-primary' : 'bg-card shadow-sm border-border'}`}>
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-md">
          Most Popular
        </div>
      )}
      <div className="mb-6">
        <h3 className="font-bold text-xl mb-2">{title}</h3>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-extrabold">{price}</span>
          {period && <span className="text-muted-foreground font-medium">{period}</span>}
        </div>
        <p className="text-muted-foreground mt-3 text-sm">{description}</p>
      </div>
      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature: string, i: number) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            <CheckCircle className={`h-4 w-4 shrink-0 ${popular ? 'text-primary' : 'text-muted-foreground'}`} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Button className="w-full" variant={outline ? "outline" : "default"} size="lg">
        {buttonText}
      </Button>
    </div>
  )
}

function SocialLink({ icon: Icon, href }: { icon: any, href: string }) {
  return (
    <Link href={href} className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
      <Icon className="h-5 w-5" />
    </Link>
  )
}

function SparklesIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  )
}