"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"

type GreetingCardProps = {
    userName: string
    role: "teacher" | "student" | null
}

import { Sun, Moon, Sunrise, Sunset } from "lucide-react"

function getGreetingData(): { text: string, icon: React.ReactNode } {
    const hour = new Date().getHours()
    if (hour < 5) return { text: "Good late night", icon: <Moon className="h-6 w-6 text-indigo-300" /> }
    if (hour < 12) return { text: "Good morning", icon: <Sunrise className="h-6 w-6 text-amber-300" /> }
    if (hour < 17) return { text: "Good afternoon", icon: <Sun className="h-6 w-6 text-orange-400" /> }
    if (hour < 21) return { text: "Good evening", icon: <Sunset className="h-6 w-6 text-indigo-400" /> }
    return { text: "Good night", icon: <Moon className="h-6 w-6 text-indigo-300" /> }
}

function getMotivationalMessage(role: "teacher" | "student" | null): string {
    const messages = {
        teacher: [
            "Ready to inspire your students today?",
            "Let's make learning amazing today!",
            "Your students are waiting for your guidance!",
            "Your impact goes beyond the classroom.",
            "Make today a masterpiece!",
        ],
        student: [
            "Ready to learn something new?",
            "Let's crush those assignments today!",
            "Every day is a chance to grow!",
            "Knowledge is power. Go get it!",
            "Small steps lead to big progress.",
        ],
    }

    const roleMessages = role ? messages[role] : messages.student
    return roleMessages[Math.floor(Math.random() * roleMessages.length)]
}

export function GreetingCard({ userName, role }: GreetingCardProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Default values for server/initial client render
    const defaultGreeting = { text: "Welcome", icon: <Sun className="h-6 w-6 text-orange-400" /> }
    const { text: greeting, icon } = mounted ? getGreetingData() : defaultGreeting

    const firstName = userName?.split(" ")[0] || "there"
    // Use a fixed value for initial render to avoid hydration mismatch
    const motivationalMessage = mounted ? getMotivationalMessage(role) : "Ready to make today amazing?"

    return (
        <Card className="border-0 overflow-hidden relative shadow-lg group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-90 transition-all duration-500 group-hover:scale-105" />

            {/* Abstract Shapes */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

            <CardContent className="py-8 px-6 sm:px-8 relative z-10 text-white">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2 max-w-3xl">
                        <div className="flex items-center gap-3 mb-1">
                            <span className="p-2 rounded-full bg-white/20 backdrop-blur-md shadow-inner">{icon}</span>
                            <span className="text-sm font-medium text-blue-100 uppercase tracking-wider">Welcome Back</span>
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-sm leading-tight">
                            {greeting}, {firstName}!
                        </h1>
                        <p className="text-blue-100 text-lg max-w-xl font-light leading-relaxed text-balance">
                            {motivationalMessage}
                        </p>
                    </div>
                    {/* Optional: Add a subtle illustration or vector art here on the right side for desktop */}
                </div>
            </CardContent>
        </Card>
    )
}
