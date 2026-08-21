import type { ReactNode } from "react"
import { Check, GraduationCap, Library, PencilRuler, Users } from "lucide-react"

import { IconBadge } from "@/components/ui/icon-badge"
import { Panel } from "@/components/ui/panel"
import { Text } from "@/components/ui/typography"
import { staggerDelay, typographyVariants } from "@/lib/design-system"
import { cn } from "@/lib/utils"

const highlights = [
  { icon: Users, title: "One shared roster", description: "Keep teachers and students in one directory." },
  { icon: GraduationCap, title: "Classes stay organized", description: "Classwork, schedules, and updates share one home." },
  { icon: Library, title: "Resources stay findable", description: "Files and links remain attached to their class." },
  { icon: PencilRuler, title: "Whiteboards are built in", description: "Teach together on a live canvas from any device." },
] as const

type OrgOnboardingAsideProps = {
  eyebrow: string
  title: ReactNode
  description: string
  showHighlights?: boolean
  className?: string
}

/** Context for focused onboarding steps, styled like a concise classroom brief. */
export function OrgOnboardingAside({
  eyebrow,
  title,
  description,
  showHighlights = true,
  className,
}: OrgOnboardingAsideProps) {
  return (
    <Panel
      variant="ghost"
      padding="none"
      className={cn("animate-rise relative px-2 py-2", className)}
    >
      <div className="space-y-3">
        <Text variant="overline" tone="primary">
          {eyebrow}
        </Text>
        <h2 className={cn(typographyVariants({ variant: "h1" }), "max-w-lg text-balance")}>{title}</h2>
        <p className={cn(typographyVariants({ variant: "bodyLg", tone: "muted" }), "max-w-lg text-pretty")}>
          {description}
        </p>
      </div>

      {showHighlights ? (
        <ul className="mt-8 grid max-w-xl gap-5 sm:grid-cols-2">
          {highlights.map((item, index) => (
            <li key={item.title} className="animate-rise flex gap-3" style={staggerDelay(index + 1, 45)}>
              <IconBadge tone="neutral" size="sm" className="mt-0.5">
                <item.icon />
              </IconBadge>
              <div className="min-w-0 space-y-0.5">
                <Text variant="h4">{item.title}</Text>
                <Text variant="caption" tone="muted">
                  {item.description}
                </Text>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-7 flex max-w-md items-start gap-3 border-t border-hairline pt-5">
          <IconBadge tone="success" size="sm">
            <Check aria-hidden="true" />
          </IconBadge>
          <Text variant="small" tone="muted">
            Joining does not create a duplicate workspace. Your classes appear as soon as the invite is accepted.
          </Text>
        </div>
      )}
    </Panel>
  )
}
