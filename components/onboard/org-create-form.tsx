"use client"

import * as React from "react"
import { ArrowLeft, ArrowRight, Building2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { typographyVariants } from "@/lib/design-system"
import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import { EntityAvatar } from "@/components/ui/entity-avatar"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldHelp,
  FieldLabel,
  InputAffix,
  affixInputClassName,
} from "@/components/ui/field"
import { IconBadge } from "@/components/ui/icon-badge"
import { Input } from "@/components/ui/input"
import { Panel, PanelBody, PanelFooter, PanelHeader, PanelHeading, PanelTitle, PanelDescription } from "@/components/ui/panel"
import { Textarea } from "@/components/ui/textarea"

const SLUG_MAX = 48
const NAME_MAX = 80
const DESCRIPTION_MAX = 200

/** Mirrors `orgSlugSchema` on the server so the field can validate as you type. */
export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
}

type OrgCreateFormProps = {
  pending: boolean
  error: string | null
  onBack: () => void
  onSubmit: (values: { name: string; slug: string; description: string }) => void
}

/**
 * Create-workspace step.
 *
 * The slug field mirrors the server rules locally and shows the resulting URL as
 * you type, so nobody discovers a formatting problem only after submitting.
 */
export function OrgCreateForm({ pending, error, onBack, onSubmit }: OrgCreateFormProps) {
  const [name, setName] = React.useState("")
  const [slug, setSlug] = React.useState("")
  const [slugTouched, setSlugTouched] = React.useState(false)
  const [description, setDescription] = React.useState("")

  const effectiveSlug = slugTouched ? slug : slugify(name)
  const slugTooShort = effectiveSlug.length > 0 && effectiveSlug.length < 3
  const canSubmit = name.trim().length > 0 && effectiveSlug.length >= 3 && !pending

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    onSubmit({ name: name.trim(), slug: effectiveSlug, description: description.trim() })
  }

  return (
    <form onSubmit={submit} noValidate>
      <Panel padding="none" className="animate-rise overflow-hidden">
        <PanelHeader>
          <PanelHeading className="flex flex-row items-center gap-3 space-y-0">
            <IconBadge tone="primary" size="md">
              <Building2 />
            </IconBadge>
            <div className="min-w-0 space-y-0.5">
              <PanelTitle>New organization</PanelTitle>
              <PanelDescription>You will be the owner and can invite others next.</PanelDescription>
            </div>
          </PanelHeading>
          <Button type="button" variant="ghost" size="sm" onClick={onBack} disabled={pending}>
            <ArrowLeft aria-hidden="true" />
            Back
          </Button>
        </PanelHeader>

        <PanelBody className="space-y-6 p-5 sm:p-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="org-name" hint={`${name.length}/${NAME_MAX}`}>
                Organization name
              </FieldLabel>
              <Input
                id="org-name"
                value={name}
                maxLength={NAME_MAX}
                autoComplete="organization"
                autoFocus
                required
                aria-describedby="org-name-help"
                placeholder="Springfield High School"
                disabled={pending}
                onChange={(event) => setName(event.target.value)}
              />
              <FieldHelp id="org-name-help">Everyone you invite will see this name.</FieldHelp>
            </Field>

            <Field>
              <FieldLabel htmlFor="org-slug" hint="Cannot be changed later">
                Workspace URL
              </FieldLabel>
              <InputAffix prefix="upclass.app/" invalid={slugTooShort}>
                <Input
                  id="org-slug"
                  value={effectiveSlug}
                  maxLength={SLUG_MAX}
                  spellCheck={false}
                  autoCapitalize="none"
                  autoComplete="off"
                  required
                  placeholder="springfield-high"
                  disabled={pending}
                  aria-invalid={slugTooShort || undefined}
                  aria-describedby={slugTooShort ? "org-slug-error" : "org-slug-help"}
                  className={cn(affixInputClassName, "type-mono")}
                  onChange={(event) => {
                    setSlugTouched(true)
                    setSlug(slugify(event.target.value))
                  }}
                />
              </InputAffix>
              {slugTooShort ? (
                <FieldError id="org-slug-error">Use at least 3 characters.</FieldError>
              ) : (
                <FieldHelp id="org-slug-help">
                  Lowercase letters, numbers and hyphens. Derived from the name unless you edit it.
                </FieldHelp>
              )}
            </Field>

            <Field>
              <FieldLabel
                htmlFor="org-description"
                optional
                hint={`${description.length}/${DESCRIPTION_MAX}`}
              >
                Description
              </FieldLabel>
              <Textarea
                id="org-description"
                value={description}
                maxLength={DESCRIPTION_MAX}
                rows={3}
                placeholder="Department of Physics, Fall intake 2026"
                disabled={pending}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
          </FieldGroup>

          {/* Live preview: shows exactly how the workspace will appear in the switcher. */}
          <div className="panel-sunken flex items-center gap-3 p-4">
            <EntityAvatar
              name={name || "New organization"}
              colorKey={effectiveSlug || "new"}
              shape="square"
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className={cn(typographyVariants({ variant: "h4" }), "truncate")}>
                {name.trim() || "Your organization"}
              </p>
              <p className={cn(typographyVariants({ variant: "mono", tone: "subtle" }), "truncate")}>
                upclass.app/{effectiveSlug || "workspace"}
              </p>
            </div>
            <span className={typographyVariants({ variant: "overline", tone: "subtle" })}>Preview</span>
          </div>

          {error ? (
            <Callout tone="danger" role="alert">
              {error}
            </Callout>
          ) : null}
        </PanelBody>

        <PanelFooter className="justify-end">
          <div className="flex w-full gap-3 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={pending}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={pending} disabled={!canSubmit} className="flex-1 sm:flex-none">
              Create organization
              {!pending ? <ArrowRight aria-hidden="true" /> : null}
            </Button>
          </div>
        </PanelFooter>
      </Panel>
    </form>
  )
}
