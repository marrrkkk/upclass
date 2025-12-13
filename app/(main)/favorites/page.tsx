import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Favorites",
}

export default function FavoritesPage() {
  return (
    <section className="flex-1">
      <p className="text-muted-foreground">Favorites</p>
    </section>
  )
}

