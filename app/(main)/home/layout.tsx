import { headers } from "next/headers"
import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { PageHeaderProvider } from "@/components/page-header-context"
import { auth } from "@/lib/auth"

export default async function HomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }
    : undefined

  return (
    <PageHeaderProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex flex-1 flex-col gap-6 p-8">
          <PageHeader user={user} />
          {children}
        </main>
      </div>
    </PageHeaderProvider>
  )
}

