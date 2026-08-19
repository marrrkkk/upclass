# Quick Reference

```tsx
<PageContainer width="content">
  <PageHeading title="Classes" description="Your current classroom workspaces." />
  <Panel>
    <PanelHeader>
      <PanelHeading>
        <PanelTitle>Needs attention</PanelTitle>
        <PanelDescription>Work that needs a decision now.</PanelDescription>
      </PanelHeading>
      <PanelActions><Button size="sm">View all</Button></PanelActions>
    </PanelHeader>
    <PanelBody>{/* rows, table, or empty state */}</PanelBody>
  </Panel>
</PageContainer>
```

Prefer composition through shared primitives and semantic tokens. Use course identity only to identify a class. Use semantic tones for status. Use icon-only controls only when the icon is familiar and has a tooltip/accessible label.


## Responsive Components

### ResponsiveOverlay
Dialog on desktop, Sheet on mobile:
```tsx
<ResponsiveOverlay 
  open={open} 
  onOpenChange={setOpen}
  title="Form Title"
  footer={<Button>Save</Button>}
>
  {content}
</ResponsiveOverlay>
```

### ResponsiveSplitView
Master/detail: one pane on mobile, split view on tablet+:
```tsx
<ResponsiveSplitView
  list={<ConversationList />}
  detail={<MessageThread />}
  listLabel="Conversations"
  detailLabel="Thread"
/>
```

### Mobile Data Components
```tsx
<MobileDataList label="People">
  <MobileDataRow className="flex-col gap-2">
    <div className="flex items-center gap-3">
      <EntityAvatar name="Student" />
      <Text>Student Name</Text>
    </div>
    {/* Expandable details */}
  </MobileDataRow>
</MobileDataList>
```

### Mobile Utilities
```tsx
className="touch-target"        // 44px min-height on mobile
className="safe-top"            // iOS notch padding top
className="safe-bottom"         // iOS home indicator padding
className="scroll-x-region"     // Contained horizontal scroll
```

### Breakpoints
- Mobile: `< md` (< 768px)
- Tablet: `md` - `lg` (768-1023px)
- Desktop: `≥ lg` (≥ 1024px)
- Wide: `≥ xl` (≥ 1280px)
