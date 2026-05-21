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
  sm: { icon: "h-4 w-4", container: "p-1", text: "text-sm" },
  md: { icon: "h-6 w-6", container: "p-1.5", text: "text-lg" },
  lg: { icon: "h-8 w-8", container: "p-2", text: "text-3xl" },
}

export function Logo({ 
  href = "/", 
  className, 
  iconClassName,
  textClassName,
  size = "md",
  showText = true,
  onClick
}: LogoProps) {
  const sizes = sizeMap[size]
  const content = (
    <div className={cn("flex items-center gap-2.5 hover:opacity-80 transition-opacity", className)}>
      <div className={cn("bg-primary/10 rounded-lg text-primary", sizes.container, iconClassName)}>
        <ArrowUpRight className={cn(sizes.icon)} strokeWidth={3} />
      </div>
      {showText && (
        <span className={cn("font-bold tracking-tight", sizes.text, textClassName)}>
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

