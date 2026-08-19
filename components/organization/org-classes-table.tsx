"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowUpRight, GraduationCap } from "lucide-react"

import { CopyButton } from "@/components/ui/copy-button"
import { CourseSwatch } from "@/components/ui/course-identity"
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmptyRow,
  DataTableHead,
  DataTableHeadCell,
  DataTableRow,
} from "@/components/ui/data-table"
import { EmptyState } from "@/components/ui/empty-state"
import { Text } from "@/components/ui/typography"
import type { OrganizationClass } from "@/types/organization"

type OrgClassesTableProps = {
  classes: OrganizationClass[]
  orgSlug: string
}

/** Dense organization class rows with safe semantic course identity. */
export function OrgClassesTable({ classes, orgSlug }: OrgClassesTableProps) {
  return (
    <DataTable>
      <DataTableHead>
        <DataTableHeadCell>Class</DataTableHeadCell>
        <DataTableHeadCell hideBelow="md">Teacher</DataTableHeadCell>
        <DataTableHeadCell>Join code</DataTableHeadCell>
        <DataTableHeadCell align="right">
          <span className="sr-only">Open</span>
        </DataTableHeadCell>
      </DataTableHead>

      <DataTableBody>
        {classes.length === 0 ? (
          <DataTableEmptyRow colSpan={4}>
            <EmptyState
              icon={<GraduationCap />}
              title="No classes yet"
              description="Classes created in this organization will appear here."
            />
          </DataTableEmptyRow>
        ) : (
          classes.map((classItem) => (
            <DataTableRow key={classItem.id}>
              <DataTableCell>
                <div className="flex min-w-0 items-center gap-3">
                  <CourseSwatch
                    value={classItem.color}
                    courseKey={classItem.id}
                    label={`${classItem.title} course`}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <Text variant="h4" as="span" truncate className="block">
                      {classItem.title}
                    </Text>
                    <Text variant="caption" tone="subtle" as="span" truncate className="block md:hidden">
                      {classItem.ownerName}
                    </Text>
                  </div>
                </div>
              </DataTableCell>

              <DataTableCell hideBelow="md">
                <Text variant="small" tone="muted" as="span">
                  {classItem.ownerName}
                </Text>
              </DataTableCell>

              <DataTableCell>
                <span className="flex items-center gap-1">
                  <Text
                    variant="mono"
                    as="code"
                    className="rounded-md border border-hairline bg-muted/60 px-2 py-1"
                  >
                    {classItem.code}
                  </Text>
                  <CopyButton value={classItem.code} label={`${classItem.title} join code`} />
                </span>
              </DataTableCell>

              <DataTableCell align="right">
                <Link
                  href={`/${orgSlug}/classes/${classItem.id}`}
                  aria-label={`Open ${classItem.title}`}
                  className="focus-ring type-small inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
                >
                  Open
                  <ArrowUpRight aria-hidden="true" className="size-3.5" />
                </Link>
              </DataTableCell>
            </DataTableRow>
          ))
        )}
      </DataTableBody>
    </DataTable>
  )
}
