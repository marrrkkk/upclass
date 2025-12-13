import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Ghost } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Page Not Found",
}

export default function NotFound() {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] opacity-70" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] opacity-70" />
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_75%)] opacity-40" />
            </div>

            <div className="w-full max-w-md space-y-8 relative z-10 text-center">
                <div className="flex flex-col items-center justify-center">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                        <div className="bg-background relative p-4 rounded-2xl ring-1 ring-border shadow-lg">
                            <Ghost className="h-12 w-12 text-primary" strokeWidth={1.5} />
                        </div>
                    </div>

                    <h1 className="text-7xl font-bold tracking-tighter bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
                        404
                    </h1>
                    <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
                        Page not found
                    </h2>
                    <p className="mt-4 text-base text-muted-foreground max-w-[300px] mx-auto">
                        Sorry, we couldn't find the page you're looking for. It might have been removed or doesn't exist.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button asChild size="lg" className="rounded-full px-8 shadow-md hover:shadow-lg transition-all active:scale-95">
                        <Link href="/home" className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Home
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="rounded-full px-8 bg-background/50 backdrop-blur-sm">
                        <Link href="/classes">
                            Browse Classes
                        </Link>
                    </Button>
                </div>

                <p className="text-xs text-muted-foreground mt-8">
                    If you believe this is an error, please <Link href="/contact" className="underline hover:text-primary transition-colors">contact support</Link>.
                </p>
            </div>
        </div>
    )
}
