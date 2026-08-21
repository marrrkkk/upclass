import { PageContainer } from "@/components/ui/section"
import { cn } from "@/lib/utils"

type ClassDetailLayoutProps = {
  hero: React.ReactNode
  navigation: React.ReactNode
  children: React.ReactNode
  /** Right-hand workspace column. Renders below content below `xl`. */
  rail?: React.ReactNode
  className?: string
}

/** Shared course workspace frame for every class detail tab. */
export function ClassDetailLayout({
  hero,
  navigation,
  children,
  rail,
  className,
}: ClassDetailLayoutProps) {
  return (
    <PageContainer width="full" className={cn("pb-8", className)}>
      {hero}
      {navigation}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Course content" className="min-w-0">{children}</section>
        {rail ? (
          <aside className="min-w-0 xl:sticky xl:top-2" aria-label="Course quick views">
            {rail}
          </aside>
        ) : null}
      </div>
    </PageContainer>
  )
}