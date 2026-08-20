import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowUpRight, Check, GraduationCap } from "lucide-react"

import SocialButton from "@/components/auth/social-button"
import { Logo } from "@/components/logo"
import { PageContainer } from "@/components/ui/section"

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
    <main className="auth-entry flex min-h-dvh items-center py-8 sm:py-12">
      <PageContainer width="wide" className="auth-entry-container px-4 sm:px-6">
        <div className="auth-layout">
          <aside className="auth-visual">
            <Logo href="/" size="lg" />
            <div className="auth-visual-copy">
              <span className="auth-kicker">UPCLASS / CLASSROOM WORKSPACE</span>
              <h1>The class is already moving.</h1>
              <p>Open one dependable place for the work, the people, and the conversations that make a class feel like a class.</p>
              <ul>
                <li><Check /> Keep lessons and resources together</li>
                <li><Check /> Give every conversation a home</li>
                <li><Check /> Pick up where you left off</li>
              </ul>
            </div>
            <div className="auth-visual-note">Made for the everyday pace of teaching and learning <ArrowUpRight /></div>
          </aside>
          <div className="auth-form-column">
            <div className="auth-form-card">
              <div className="auth-form-mark"><GraduationCap /></div>
              <div className="auth-form-heading"><span>ACCOUNT ACCESS</span><h2>{title}</h2><p>{description}</p></div>
              <SocialButton provider="google" className="auth-google-button w-full">{providerLabel}</SocialButton>
              <div className="auth-divider"><span>or continue with Google</span></div>
              <p className="auth-legal">{legalPrefix} <Link href="/terms">Terms of Service</Link> and <Link href="/privacy">Privacy Policy</Link>.</p>
            </div>
            <p className="auth-footer-copy">{footer}</p>
          </div>
        </div>
      </PageContainer>
    </main>
  )
}
