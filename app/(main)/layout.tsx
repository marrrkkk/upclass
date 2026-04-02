import type { Metadata } from "next"
import { Suspense } from "react"
import { MainLayoutClient } from "@/components/main-layout-client"
import { HomeShell } from "@/components/layouts/home-shell"
import { RootClientShell } from "@/components/root-client-shell"
import { getMainShellState } from "@/lib/server/auth"

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
}

async function ResolvedMainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { hasRole, isAuthenticated, userId, userInfo, userRole } = await getMainShellState()

  return (
    <MainLayoutClient hasRole={hasRole} isAuthenticated={isAuthenticated}>
      <HomeShell
        hasRole={hasRole}
        isAuthenticated={isAuthenticated}
        isShellResolved
        userInfo={userInfo}
        userId={userId}
        userRole={userRole}
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
  return (
    <HomeShell hasRole={false} isAuthenticated={false} isShellResolved={false} userRole={null}>
      {children}
    </HomeShell>
  )
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
