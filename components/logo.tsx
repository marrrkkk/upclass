import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"

type LogoProps = {
  href?: string
  className?: string
  iconClassName?: string
  textClassName?: string
  size?: "sm" | "md" | "lg"
  showText?: boolean
  onClick?: () => void
}

const sizeMap = {
  sm: { icon: "h-4 w-4", text: "text-sm" },
  md: { icon: "h-5 w-5", text: "text-lg" },
  lg: { icon: "h-7 w-7", text: "text-2xl" },
}

export function Logo({ 
  href = "/dashboard", 
  className, 
  iconClassName,
  textClassName,
  size = "md",
  showText = true,
  onClick
}: LogoProps) {
  const sizes = sizeMap[size]
  const content = (
    <div className={cn("flex items-center gap-2 transition-opacity hover:opacity-80", className)}>
      <span className="inline-flex items-center justify-center rounded-[var(--radius-control)] bg-primary p-1 text-primary-foreground">
        <ArrowUpRight className={cn(sizes.icon, iconClassName)} strokeWidth={2.5} />
      </span>
      {showText && (
        <span className={cn("font-display font-semibold", sizes.text, textClassName)}>
          UpClass
        </span>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} onClick={onClick} className="inline-block">
        {content}
      </Link>
    )
  }

  return <div onClick={onClick}>{content}</div>
}
