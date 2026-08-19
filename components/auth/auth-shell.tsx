import type { ReactNode } from "react"
import Link from "next/link"
import { GraduationCap } from "lucide-react"

import SocialButton from "@/components/auth/social-button"
import { Logo } from "@/components/logo"
import { IconBadge } from "@/components/ui/icon-badge"
import { Panel, PanelBody } from "@/components/ui/panel"
import { PageContainer, PageHeading } from "@/components/ui/section"
import { Text } from "@/components/ui/typography"

type AuthShellProps = {
  title: string
  description: string
  providerLabel: string
  legalPrefix: string
  footer: ReactNode
}

/** Shared, distraction-free frame for account entry routes. */
export function AuthShell({
  title,
  description,
  providerLabel,
  legalPrefix,
  footer,
}: AuthShellProps) {
  return (
    <main className="flex min-h-dvh items-center bg-background py-10">
      <PageContainer width="narrow" className="flex flex-col gap-6 px-4 sm:px-6">
        <div className="flex justify-center">
          <Logo href="/" size="lg" />
        </div>

        <Panel padding="none">
          <PanelBody className="flex flex-col gap-6 p-6 sm:p-8">
            <PageHeading
              title={title}
              description={description}
              media={
                <IconBadge tone="primary" size="lg">
                  <GraduationCap />
                </IconBadge>
              }
            />

            <SocialButton provider="google" className="w-full">
              {providerLabel}
            </SocialButton>

            <Text variant="caption" tone="muted" className="text-center">
              {legalPrefix}{" "}
              <Link className="focus-ring rounded-sm underline underline-offset-4 hover:text-foreground" href="/terms">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link className="focus-ring rounded-sm underline underline-offset-4 hover:text-foreground" href="/privacy">
                Privacy Policy
              </Link>
              .
            </Text>
          </PanelBody>
        </Panel>

        <Text variant="small" tone="muted" className="text-center">
          {footer}
        </Text>
      </PageContainer>
    </main>
  )
}
