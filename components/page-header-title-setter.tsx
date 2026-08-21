"use client"

import { useEffect } from "react"

import { usePageHeaderStore } from "@/stores/page-header-store"

/**
 * Sets the header breadcrumb to a deep page's own title (e.g. a class name on
 * class detail routes) and restores the default route title when leaving.
 */
export function PageHeaderTitleSetter({ title }: { title: string }) {
  const setPageTitle = usePageHeaderStore((state) => state.setPageTitle)

  useEffect(() => {
    setPageTitle(title)
    return () => setPageTitle(null)
  }, [setPageTitle, title])

  return null
}