import * as React from "react"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

/**
 * Semantic alias for mutually exclusive in-page views. It intentionally shares
 * Radix Tabs' keyboard behavior and renders the reference treatment: gray
 * track with an azure-filled active segment.
 */
function Segmented(props: React.ComponentProps<typeof Tabs>) {
  return <Tabs variant="pill" {...props} />
}

function SegmentedList(props: React.ComponentProps<typeof TabsList>) {
  return <TabsList variant="pill" {...props} />
}

function SegmentedItem(props: React.ComponentProps<typeof TabsTrigger>) {
  return <TabsTrigger variant="pill" {...props} />
}

export { Segmented, SegmentedList, SegmentedItem }
