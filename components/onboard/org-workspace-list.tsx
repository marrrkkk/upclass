"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, ArrowUpRight, KeyRound, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { monogram, staggerDelay } from "@/lib/design-system"
import { cn } from "@/lib/utils"
import type { OrganizationSummary } from "@/types/organization"

type OrgWorkspaceListProps = {
  organizations: OrganizationSummary[]
  greetingName?: string | null
  onCreate: () => void
  onJoin: () => void
}

const shellGutter = "mx-auto w-full max-w-[88rem] px-4 sm:px-6 md:px-8"

/**
 * Org entry screen: full-bleed welcome hero over a quiet card grid.
 */
export function OrgWorkspaceList({
  organizations,
  greetingName,
  onCreate,
  onJoin,
}: OrgWorkspaceListProps) {
  const firstName = greetingName?.trim().split(/\s+/)[0]

  return (
    <div className="flex w-full flex-col">
      <section aria-labelledby="org-hero-title" className="relative isolate overflow-hidden border-b border-hairline/70">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background to-primary-soft/50" />
          <div className="absolute -top-[1.5rem] left-[30%] size-[70rem] rounded-full bg-gradient-to-br from-primary-muted via-primary-soft/90 to-primary-soft/20" />
          <ArrowUpRight
            className="absolute right-[5%] top-[58%] size-24 -translate-y-1/2 text-white/85 sm:size-32"
            strokeWidth={2.25}
          />
        </div>

        <div className={cn(shellGutter, "flex flex-col items-start gap-4 py-14 sm:gap-5 sm:py-20")}>
          <h1 id="org-hero-title" className="type-hero max-w-[14ch] text-foreground">
            {firstName ? (
              <>
                Good to see you, <br className="hidden sm:block" />
                {firstName}
              </>
            ) : (
              "Good to see you"
            )}
          </h1>
          <p className="type-body-lg text-muted-foreground">Pick up where you left off.</p>
          <Button size="lg" className="mt-1 sm:mt-2" onClick={onCreate}>
            <Plus aria-hidden="true" />
            Create organization
          </Button>
        </div>
      </section>

      <section aria-labelledby="org-directory-title" className={cn(shellGutter, "flex flex-col gap-4 py-10 sm:gap-5 sm:py-12")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="org-directory-title" className="type-h2 text-foreground">
            Your organizations
          </h2>
          <Button variant="ghost" size="sm" onClick={onJoin}>
            <KeyRound aria-hidden="true" />
            Join with a code
          </Button>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {organizations.map((organization, index) => (
            <OrganizationCard
              key={organization.id}
              organization={organization}
              style={staggerDelay(index)}
            />
          ))}
          <CreateOrganizationCard onClick={onCreate} style={staggerDelay(organizations.length)} />
        </div>
      </section>
    </div>
  )
}

/** Org card: course-colour banner, monogram tile, and a quiet open affordance. */
function OrganizationCard({
  organization,
  style,
}: {
  organization: OrganizationSummary
  style?: React.CSSProperties
}) {
  return (
    <Link
      href={`/${organization.slug}/dashboard`}
      style={style}
      className={cn(
        "group focus-ring animate-rise motion-lift relative flex flex-col overflow-hidden rounded-[var(--radius-container)] border border-hairline bg-card",
      )}
    >
      <div
        className={cn(
          "relative h-24 overflow-hidden bg-gradient-to-br from-primary via-primary-strong to-primary-active sm:h-28",
        )}
        style={
          organization.cover
            ? {
                backgroundImage: `linear-gradient(rgba(0,0,0,0.08), rgba(0,0,0,0.08)), url("${organization.cover}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        {!organization.cover ? (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(130%_130%_at_100%_0%,rgba(255,255,255,0.3),transparent_55%)]"
          />
        ) : null}
        <Avatar className="absolute left-4 top-4 size-11 rounded-xl bg-white ring-1 ring-black/5 sm:size-12">
          {organization.logo ? (
            <AvatarImage src={organization.logo} alt="" className="rounded-[inherit]" />
          ) : null}
          <AvatarFallback className="rounded-[inherit] bg-white font-display text-base font-semibold text-primary">
            {monogram(organization.name)}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="type-h3 line-clamp-2 text-foreground">{organization.name}</span>
        <span className="type-caption text-muted-foreground">
          {organization.memberCount} {organization.memberCount === 1 ? "member" : "members"}
        </span>
      </div>

      <div className="flex items-center justify-end border-t border-hairline bg-surface-subtle px-4 py-2.5">
        <ArrowRight
          aria-hidden="true"
          className="size-4 text-foreground-secondary motion-icon group-hover:translate-x-0.5 group-hover:text-primary-text"
        />
      </div>
    </Link>
  )
}

/** Dashed-free create card that matches the org card footprint. */
function CreateOrganizationCard({
  onClick,
  style,
}: {
  onClick: () => void
  style?: React.CSSProperties
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={cn(
        "group focus-ring animate-rise motion-lift flex flex-col items-center justify-center gap-2.5 rounded-[var(--radius-container)] border border-hairline bg-card p-6 text-center",
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-primary-surface text-primary motion-interactive group-hover:bg-primary-muted">
        <Plus className="size-5" aria-hidden="true" />
      </span>
      <span className="type-h3 text-foreground">Create organization</span>
      <span className="type-small max-w-[14rem] text-muted-foreground">
        Start a new school workspace.
      </span>
    </button>
  )
}
