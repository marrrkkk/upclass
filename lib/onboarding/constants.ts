export const ONBOARDING_FLOW_VERSION = 1

export const TEACHER_SETUP_STEPS = ["workspace", "class", "invite", "finish"] as const
export type TeacherSetupStep = (typeof TEACHER_SETUP_STEPS)[number]

export const ACCOUNT_SETUP_SCOPE = "account"

export function orgSetupScopeKey(orgId: string): string {
  return `org:${orgId}`
}

export function isUsableDisplayName(name: string | null | undefined): boolean {
  const trimmed = name?.trim() ?? ""
  return trimmed.length >= 2
}
