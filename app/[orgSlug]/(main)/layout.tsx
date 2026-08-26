import type { Metadata } from "next";
import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { Suspense } from "react";
import { and, desc, eq, or } from "drizzle-orm";

import { MainLayoutClient } from "@/components/main-layout-client";
import { HomeShell } from "@/components/layouts/home-shell";
import { RootClientShell } from "@/components/root-client-shell";
import { db } from "@/db";
import { classes, classMembership, organizations } from "@/db/schema";
import { getOrganizationMembership } from "@/lib/org-validation";
import { getMainShellState } from "@/lib/server/auth";
import type { OrgRole } from "@/types/organization";

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
};

function loadRecentClasses(
  userId: string,
  orgSlug: string,
): Promise<Array<{ id: string; title: string; color: string | null }>> {
  return db
    .select({
      id: classes.id,
      title: classes.title,
      color: classes.color,
    })
    .from(classes)
    .innerJoin(organizations, eq(classes.orgId, organizations.id))
    .leftJoin(classMembership, eq(classMembership.classId, classes.id))
    .where(
      and(
        eq(organizations.slug, orgSlug),
        or(eq(classes.ownerId, userId), eq(classMembership.userId, userId)),
      ),
    )
    .groupBy(classes.id)
    .orderBy(desc(classes.updatedAt))
    .limit(5);
}

async function ResolvedMainLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const cookieStore = await cookies();
  const defaultSidebarOpen =
    cookieStore.get("sidebar_state")?.value !== "false";

  let hasOrganization = false;
  let isAuthenticated = false;
  let userId: string | undefined;
  let userInfo: {
    name: string | null;
    email: string | null;
    image: string | null;
  } | null = null;
  let organizationId: string | null = null;
  let organizationRole: OrgRole | null = null;
  let recentClasses: Array<{
    id: string;
    title: string;
    color: string | null;
  }> = [];

  try {
    const [{ orgSlug }, shellState] = await Promise.all([
      params,
      getMainShellState(),
    ]);
    hasOrganization = shellState.hasOrganization;
    isAuthenticated = shellState.isAuthenticated;
    userId = shellState.userId;
    userInfo = shellState.userInfo;

    if (shellState.userId) {
      // Membership and recent classes are independent once the session is
      // known; resolving them together avoids a serial waterfall (the
      // classes query joins on the org slug directly instead of waiting
      // for the membership's org id).
      const [membership, loadedRecentClasses] = await Promise.all([
        getOrganizationMembership(shellState.userId, orgSlug).catch(
          () => null,
        ),
        loadRecentClasses(shellState.userId, orgSlug).catch(() => []),
      ]);
      organizationId = membership?.orgId ?? null;
      organizationRole = membership?.role ?? null;
      recentClasses = loadedRecentClasses;
    }
  } catch (error) {
    unstable_rethrow(error);
    console.error("Error in getMainShellState:", error);
  }

  return (
    <MainLayoutClient
      hasOrganization={hasOrganization}
      isAuthenticated={isAuthenticated}
    >
      <HomeShell
        isAuthenticated={isAuthenticated}
        recentClasses={recentClasses}
        userInfo={userInfo}
        userId={userId}
        organizationRole={organizationRole}
        defaultSidebarOpen={defaultSidebarOpen}
      >
        {children}
      </HomeShell>
    </MainLayoutClient>
  );
}

function MainLayoutFallback({ children }: { children: React.ReactNode }) {
  return (
    <HomeShell isAuthenticated={false} pending>
      {children}
    </HomeShell>
  );
}

export default function MainLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  return (
    <RootClientShell>
      <Suspense fallback={<MainLayoutFallback>{children}</MainLayoutFallback>}>
        <ResolvedMainLayout params={params}>{children}</ResolvedMainLayout>
      </Suspense>
    </RootClientShell>
  );
}
