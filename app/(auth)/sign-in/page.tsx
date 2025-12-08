import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import SocialButton from "@/components/auth/social-button"
import { BookOpen } from "lucide-react"
import Link from "next/link"

export default function SignInPage() {
    return (
        <div className="flex min-h-screen w-full items-center justify-center p-4 bg-muted/40">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="flex items-center gap-2 font-bold text-xl text-primary">
                            <BookOpen className="h-6 w-6" />
                            <span>UpClass</span>
                        </div>
                    </div>
                    <CardTitle className="text-2xl">Welcome back</CardTitle>
                    <CardDescription>
                        Sign in to your account to continue
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                        <SocialButton provider="google" className="w-full">
                            Continue with Google
                        </SocialButton>
                    </div>
                    <div className="text-center text-sm text-muted-foreground mt-2">
                        Don&apos;t have an account?{" "}
                        <Link href="/sign-up" className="underline underline-offset-4 hover:text-primary">
                            Sign up
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}