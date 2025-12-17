
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { ArrowRight, LayoutDashboard } from "lucide-react"
import { Logo } from "@/components/logo"

export default async function LandingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  const isAuthenticated = !!session?.user

  // Redirect authenticated users to /home
  if (isAuthenticated) {
    redirect("/home")
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Decorative Background */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      </div>

      {/* Navbar */}
      <header className="container mx-auto px-6 py-6 relative z-10 flex items-center justify-between">
        <Logo href="/" size="md" />
      </header>

      {/* Hero Content */}
      <main className="flex-1 flex flex-col justify-center items-center text-center relative z-10 container mx-auto px-4 pb-20">
        <div className="max-w-4xl space-y-8">
          <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            ✨ The Future of Learning Management
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100 leading-tight">
            Elevate your <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">Classroom</span> Experience
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
            UpClass provides the tools you need to manage courses, engage students, and track progress—all in one intuitive platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom-7 duration-700 delay-300">
            {isAuthenticated ? (
              <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-105" asChild>
                <Link href="/home">
                  Go to Dashboard <LayoutDashboard className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            ) : (
              <>
                <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-105" asChild>
                  <Link href="/sign-in">
                    Log In
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-2 hover:bg-muted/50 transition-all hover:scale-105" asChild>
                  <Link href="/sign-up">
                    Sign Up <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-6 text-center text-muted-foreground text-sm">
        © {new Date().getFullYear()} UpClass. All rights reserved.
      </footer>
    </div>
  )
}
