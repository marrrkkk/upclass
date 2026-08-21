import * as React from "react"

import { cn } from "@/lib/utils"
import { typographyVariants } from "@/lib/design-system"

/**
 * Linear-style data table.
 *
 * Semantics stay a real `<table>` so screen readers keep header association,
 * while secondary columns are hidden with `hidden md:table-cell` on narrow
 * viewports. Rows get hairline dividers and a hover wash — no zebra striping,
 * no vertical rules, no per-cell borders.
 *
 * ```tsx
 * <DataTable>
 *   <DataTableHead>
 *     <DataTableHeadCell>Member</DataTableHeadCell>
 *     <DataTableHeadCell align="right">Actions</DataTableHeadCell>
 *   </DataTableHead>
 *   <DataTableBody>
 *     <DataTableRow>
 *       <DataTableCell>…</DataTableCell>
 *       <DataTableCell align="right">…</DataTableCell>
 *     </DataTableRow>
 *   </DataTableBody>
 * </DataTable>
 * ```
 */
function DataTable({ className, children, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="data-table-scroll" className="w-full overflow-x-auto">
      <table
        data-slot="data-table"
        className={cn("w-full caption-bottom border-collapse text-left", className)}
        {...props}
      >
        {children}
      </table>
    </div>
  )
}

function DataTableHead({ className, children, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead data-slot="data-table-head" className={cn("bg-surface-sunken/85", className)} {...props}>
      <tr>{children}</tr>
    </thead>
  )
}

const alignClasses = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const

type CellAlign = keyof typeof alignClasses

function DataTableHeadCell({
  className,
  align = "left",
  hideBelow,
  ...props
}: React.ComponentProps<"th"> & {
  align?: CellAlign
  /** Breakpoint below which the column is hidden. */
  hideBelow?: "sm" | "md" | "lg"
}) {
  return (
    <th
      scope="col"
      data-slot="data-table-head-cell"
      className={cn(
        typographyVariants({ variant: "overline", tone: "muted" }),
        "h-8 whitespace-nowrap px-3 align-middle font-semibold",
        alignClasses[align],
        hideBelow === "sm" && "hidden sm:table-cell",
        hideBelow === "md" && "hidden md:table-cell",
        hideBelow === "lg" && "hidden lg:table-cell",
        className,
      )}
      {...props}
    />
  )
}

function DataTableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="data-table-body"
      className={cn("divide-y divide-hairline", className)}
      {...props}
    />
  )
}

function DataTableRow({
  className,
  interactive = false,
  ...props
}: React.ComponentProps<"tr"> & { interactive?: boolean }) {
  return (
    <tr
      data-slot="data-table-row"
      className={cn(
        "group/row transition-colors duration-150 ease-out-expo",
        interactive ? "cursor-pointer hover:bg-muted/50" : "hover:bg-muted/30",
        className,
      )}
      {...props}
    />
  )
}

function DataTableCell({
  className,
  align = "left",
  hideBelow,
  ...props
}: React.ComponentProps<"td"> & {
  align?: CellAlign
  hideBelow?: "sm" | "md" | "lg"
}) {
  return (
    <td
      data-slot="data-table-cell"
      className={cn(
        "px-3 py-2 align-middle type-small",
        alignClasses[align],
        hideBelow === "sm" && "hidden sm:table-cell",
        hideBelow === "md" && "hidden md:table-cell",
        hideBelow === "lg" && "hidden lg:table-cell",
        className,
      )}
      {...props}
    />
  )
}

/** Full-width row used to host an empty state inside a table body. */
function DataTableEmptyRow({
  colSpan,
  className,
  children,
  ...props
}: React.ComponentProps<"td"> & { colSpan: number }) {
  return (
    <tr data-slot="data-table-empty-row">
      <td colSpan={colSpan} className={cn("p-0", className)} {...props}>
        {children}
      </td>
    </tr>
  )
}

export {
  DataTable,
  DataTableHead,
  DataTableHeadCell,
  DataTableBody,
  DataTableRow,
  DataTableCell,
  DataTableEmptyRow,
}
