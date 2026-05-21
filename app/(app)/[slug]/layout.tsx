import type { Metadata } from "next"
import { Suspense } from "react"
import { MainLayoutClient } from "@/components/main-layout-client"
import { HomeShell } from "@/components/layouts/home-shell"
import { getMainShellState } from "@/lib/server/auth"
import { getUserOrganizations } from "@/app/actions/organizations"

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

async function ResolvedOrgLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, userId, userInfo } = await getMainShellState()

  const orgResult = userId ? await getUserOrganizations() : null
  const userOrgs = orgResult?.success ? orgResult.data.map((o) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    role: o.role,
    logo: o.logo,
  })) : []

  return (
    <MainLayoutClient>
      <HomeShell
        isAuthenticated={isAuthenticated}
        userInfo={userInfo}
        userId={userId}
        userOrgs={userOrgs}
      >
        {children}
      </HomeShell>
    </MainLayoutClient>
  )
}

function OrgLayoutFallback({ children }: { children: React.ReactNode }) {
  return <HomeShell isAuthenticated={false}>{children}</HomeShell>
}

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<OrgLayoutFallback>{children}</OrgLayoutFallback>}>
      <ResolvedOrgLayout>{children}</ResolvedOrgLayout>
    </Suspense>
  )
}
