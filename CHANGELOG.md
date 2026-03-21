# Changelog

## Unreleased

### Performance
- stream main authenticated pages through localized `Suspense` boundaries instead of route-wide loading states
- add shared server session helpers and SQL-backed message conversation summaries to reduce repeated work
- extend App Router dynamic cache lifetime and remove route-level loading files for warmed in-session revisits

### Classes
- make class tab switching optimistic so the active tab changes immediately
- scope class detail loading to tab content and use tab-specific skeletons
- keep visited class tabs warm during the current app session to avoid repeated loading flashes

### UI
- add dedicated skeletons for classwork cards, quiz cards, class tab panels, home sections, messages, and notifications
- align notifications and classwork/quiz placeholders with their actual layouts
