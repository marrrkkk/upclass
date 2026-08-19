import type { Metadata } from "next";
import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { Suspense } from "react";
import { and, desc, eq, or } from "drizzle-orm";

import { MainLayoutClient } from "@/components/main-layout-client";
import { HomeShell } from "@/components/layouts/home-shell";
import { RootClientShell } from "@/components/root-client-shell";
import { db } from "@/db";
import { classes, classMembership } from "@/db/schema";
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

  try {
    const shellState = await getMainShellState();
    hasOrganization = shellState.hasOrganization;
    isAuthenticated = shellState.isAuthenticated;
    userId = shellState.userId;
    userInfo = shellState.userInfo;

    const { orgSlug } = await params;
    if (shellState.userId) {
      const membership = await getOrganizationMembership(
        shellState.userId,
        orgSlug,
      );
      organizationId = membership?.orgId ?? null;
      organizationRole = membership?.role ?? null;
    }
  } catch (error) {
    unstable_rethrow(error);
    console.error("Error in getMainShellState:", error);
  }

  let recentClasses: Array<{
    id: string;
    title: string;
    color: string | null;
  }> = [];

  if (userId && organizationId) {
    try {
      recentClasses = await db
        .select({
          id: classes.id,
          title: classes.title,
          color: classes.color,
        })
        .from(classes)
        .leftJoin(classMembership, eq(classMembership.classId, classes.id))
        .where(
          and(
            eq(classes.orgId, organizationId),
            or(eq(classes.ownerId, userId), eq(classMembership.userId, userId)),
          ),
        )
        .groupBy(classes.id)
        .orderBy(desc(classes.updatedAt))
        .limit(5);
    } catch (error) {
      console.error("Failed to fetch recent classes:", error);
    }
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
  return <HomeShell isAuthenticated={false}>{children}</HomeShell>;
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
