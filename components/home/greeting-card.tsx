"use client"

import { Card, CardContent } from "@/components/ui/card"

type GreetingCardProps = {
    userName: string
    role: "teacher" | "student" | null
}

function getGreeting(): string {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
}

function getMotivationalMessage(role: "teacher" | "student" | null): string {
    const messages = {
        teacher: [
            "Ready to inspire your students today?",
            "Let's make learning amazing today!",
            "Your students are waiting for your guidance!",
        ],
        student: [
            "Ready to learn something new?",
            "Let's crush those assignments today!",
            "Every day is a chance to grow!",
        ],
    }

    const roleMessages = role ? messages[role] : messages.student
    return roleMessages[Math.floor(Math.random() * roleMessages.length)]
}

export function GreetingCard({ userName, role }: GreetingCardProps) {
    const greeting = getGreeting()
    const firstName = userName?.split(" ")[0] || "there"
    const motivationalMessage = getMotivationalMessage(role)

    return (
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <CardContent className="py-6 relative">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight">
                        {greeting}, <span className="text-primary">{firstName}</span>! 👋
                    </h1>
                    <p className="text-muted-foreground">
                        {motivationalMessage}
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
