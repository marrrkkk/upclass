"use client"

import { track } from "@vercel/analytics"

export type OnboardingAnalyticsEvent =
  | "onboarding_started"
  | "account_setup_completed"
  | "organization_created"
  | "class_created"
  | "invite_shared"
  | "class_joined"
  | "onboarding_skipped"
  | "onboarding_completed"

type OnboardingEventProps = {
  flowVersion?: number
  entrySource?: string
  organizationId?: string
  role?: string
  step?: string
}

export function trackOnboardingEvent(
  event: OnboardingAnalyticsEvent,
  props?: OnboardingEventProps,
) {
  try {
    track(event, props ?? {})
  } catch {
    // Analytics should never block onboarding flows.
  }
}
