import SocialButton from "@/components/auth/social-button"
import Link from "next/link"
import type { Metadata } from "next"
import { Logo } from "@/components/logo"

export const metadata: Metadata = {
    title: "Sign Up",
    description: "Create an UpClass account to organize classes, teach with shared whiteboards, and support students in one workspace.",
    alternates: {
        canonical: "/sign-up",
    },
    robots: {
        index: false,
        follow: false,
    },
}

export default function SignUpPage() {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] opacity-70" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] opacity-70" />
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_75%)] opacity-40" />
            </div>

            <div className="w-full max-w-md space-y-8 relative z-10">
                <div className="flex flex-col items-center text-center">
                    <div className="mb-6">
                        <Logo href="/" size="lg" textClassName="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent" />
                    </div>

                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                        Create an account
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                        Join UpClass today to start your learning journey.
                    </p>
                </div>

                <div className="bg-card px-4 py-8 shadow-sm ring-1 ring-border sm:rounded-xl sm:px-10">
                    <div className="space-y-6">
                        <SocialButton
                            provider="google"
                            className="w-full h-11 text-sm font-medium shadow-sm hover:shadow active:scale-[0.98] transition-all border-muted-foreground/20"
                        >
                            Sign up with Google
                        </SocialButton>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-muted" />
                            </div>
                        </div>

                        <div className="text-center text-xs text-muted-foreground">
                            By creating an account, you agree to our{" "}
                            <Link href="/terms" className="underline underline-offset-4 hover:text-primary transition-colors">
                                Terms of Service
                            </Link>{" "}
                            and{" "}
                            <Link href="/privacy" className="underline underline-offset-4 hover:text-primary transition-colors">
                                Privacy Policy
                            </Link>
                            .
                        </div>
                    </div>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                    Already have an account? <Link href="/sign-in" className="font-medium text-primary hover:text-primary/80 transition-colors">Sign in</Link>
                </p>
            </div>
        </div>
    )
}
