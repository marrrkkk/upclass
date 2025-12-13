import SocialButton from "@/components/auth/social-button"
import { ArrowUpRight } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Sign In",
}

export default function SignInPage() {
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
                    <Link href="/" className="mb-6 flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                        <div className="bg-primary/10 p-2 rounded-xl ring-1 ring-primary/20 shadow-sm">
                            <ArrowUpRight className="h-8 w-8 text-primary" strokeWidth={3} />
                        </div>
                        <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent font-bold text-3xl tracking-tight">UpClass</span>
                    </Link>

                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                        Welcome back
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                        Sign in to your account to continue managing your classes and tracking student progress.
                    </p>
                </div>

                <div className="bg-card px-4 py-8 shadow-sm ring-1 ring-border sm:rounded-xl sm:px-10">
                    <div className="space-y-6">
                        <SocialButton
                            provider="google"
                            className="w-full h-11 text-sm font-medium shadow-sm hover:shadow active:scale-[0.98] transition-all border-muted-foreground/20"
                        >
                            Continue with Google
                        </SocialButton>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-muted" />
                            </div>
                        </div>

                        <div className="text-center text-xs text-muted-foreground">
                            By continuing, you agree to our{" "}
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
                    Need help? <Link href="/contact" className="font-medium text-primary hover:text-primary/80 transition-colors">Contact Support</Link>
                </p>
            </div>
        </div>
    )
}