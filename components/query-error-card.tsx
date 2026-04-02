import { Button } from "@/components/ui/button"

export function QueryErrorCard({
  title,
  description,
  onRetry,
}: {
  title: string
  description: string
  onRetry: () => void
}) {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4">
        <Button variant="outline" onClick={onRetry} type="button">
          Try Again
        </Button>
      </div>
    </div>
  )
}
