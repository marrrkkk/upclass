import { Suspense } from "react"
import { MainLayoutClient } from "@/components/main-layout-client"
import { HomeShell } from "@/components/layouts/home-shell"
import { RootClientShell } from "@/components/root-client-shell"
import { getMainShellState } from "@/lib/server/auth"

async function ResolvedMainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { hasRole, isAuthenticated, userId, userInfo } = await getMainShellState()

  return (
    <MainLayoutClient hasRole={hasRole} isAuthenticated={isAuthenticated}>
      <HomeShell
        isAuthenticated={isAuthenticated}
        userInfo={userInfo}
        userId={userId}
      >
        {children}
      </HomeShell>
    </MainLayoutClient>
  )
}

function MainLayoutFallback({
  children,
}: {
  children: React.ReactNode
}) {
  return <HomeShell isAuthenticated={false}>{children}</HomeShell>
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RootClientShell>
      <Suspense fallback={<MainLayoutFallback>{children}</MainLayoutFallback>}>
        <ResolvedMainLayout>{children}</ResolvedMainLayout>
      </Suspense>
    </RootClientShell>
  )
}
