import * as React from "react"

import { cn } from "@/lib/utils"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: "default" | "sm"
    ref?: React.Ref<HTMLDivElement>
}

function Card({ className, size = "default", ref, ...props }: CardProps) {
    return (
        <div
            ref={ref}
            className={cn(
                "surface-card rounded-xl text-card-foreground transition-all duration-200 ease-out",
                size === "sm" ? "p-3 gap-3" : "px-4 pt-4 sm:px-6 sm:pt-6 gap-5",
                className
            )}
            {...props}
        />
    )
}

function CardHeader({
    className,
    ref,
    ...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) {
    return (
        <div
            ref={ref}
            className={cn("flex flex-col space-y-1.5 p-6", className)}
            {...props}
        />
    )
}

function CardTitle({
    className,
    children,
    ref,
    ...props
}: React.HTMLAttributes<HTMLHeadingElement> & { ref?: React.Ref<HTMLHeadingElement> }) {
    return (
        <h3
            ref={ref}
            className={cn(
                "text-2xl font-semibold leading-none tracking-tight",
                className
            )}
            {...props}
        >
            {children}
        </h3>
    )
}

function CardDescription({
    className,
    ref,
    ...props
}: React.HTMLAttributes<HTMLParagraphElement> & { ref?: React.Ref<HTMLParagraphElement> }) {
    return (
        <p
            ref={ref}
            className={cn("text-sm text-muted-foreground", className)}
            {...props}
        />
    )
}

function CardContent({
    className,
    ref,
    ...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) {
    return (
        <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
    )
}

function CardFooter({
    className,
    ref,
    ...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) {
    return (
        <div
            ref={ref}
            className={cn("surface-card-footer flex items-center border-t border-border/75 p-6 pt-0", className)}
            {...props}
        />
    )
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
