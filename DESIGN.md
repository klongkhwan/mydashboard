# AllBoard design system

AllBoard is a compact, dark dashboard with a green action accent. Keep the existing
layouts and information density. Dark-only appearance is an explicit product
decision (2026-10-22); there is no light-mode switch or OS-dependent palette.

## Source of truth

- `styles/globals.css`: semantic color, type, spacing, sizing, radius, elevation,
  stacking, and motion tokens; reduced-motion behavior.
- `components/ui`: reusable Radix primitives and their variants.
- `app/layout.tsx`: the `dark` class, Geist fonts, and shared Sonner toaster.
- Keep user data, chart series colors, category colors, document paper, video
  canvases, and external service branding separate from interface colors.

## Tokens

| Role | Tokens / utilities | Rule |
| --- | --- | --- |
| Page / surfaces | `background`, `card`, `popover`, `secondary`, `muted`, `surface-hover` | Page → card → floating surface; hover only on interactive elements |
| Text | `foreground`, `muted-foreground`, matching `*-foreground` | Always pair filled backgrounds with their foreground token |
| Action | `primary`, `primary-hover`, `primary-foreground` | Green actions use dark text |
| Status | `success`, `warning`, `info`, `destructive` | Include text or an icon; pink filled actions use `destructive-foreground` |
| Boundaries | `border`, `input`, `ring` | Decorative divider, identifiable control boundary, keyboard focus |
| Type | `font-sans` / `font-mono`; `text-xs` through `text-3xl` | Geist UI; mono/tabular numbers for data; 12–14px labels, 16px mobile inputs, 20–30px headings |
| Space | `--spacing: .25rem` | Use Tailwind multiples: 1, 2, 3, 4, 6, 8; retain existing responsive breakpoints |
| Control size | `h-control-sm` (32px), `h-control` (36px), `h-control-lg` (44px) | Compact, default, touch/pill |
| Radius | `rounded-sm/md/lg/xl` = 4/6/8/12px; `rounded-full` | Controls 6px, cards and overlays 12px, explicit pills only |
| Elevation | `shadow-card`, `shadow-popover`, `shadow-dialog` | Subtle card, floating menu, modal; avoid stacked decorative shadows |
| Stacking | `--z-navigation` 20, `--z-overlay` 50, `--z-notification` 100 | Keep portals above navigation |
| Motion | `--motion-fast/normal/slow` 150/200/300ms, `--ease-standard` | Color transitions for controls; reduced motion disables ongoing animation |

Change the palette in `:root`; do not introduce a second palette in individual
pages. Tailwind's `@theme inline` resolves those roles for components and portals.
Native inputs use `color-scheme: dark`. A future light mode requires a complete
palette plus a separate audit of page-specific and third-party chart styles.

## Component rules

| Component | Contract |
| --- | --- |
| Button | `default`, `secondary`, `outline`, `ghost`, `destructive`, `link`; existing `pill`, `pill-secondary`, `glass` retained. Use `size` for geometry. Do not override a variant's color with a literal hex. |
| Input | `variant="default"` or `"pill"`; labels are required. Use `aria-invalid` and `aria-describedby` for errors. |
| Textarea | Same boundaries, focus, and invalid state as Input; vertically resizable. |
| Select / dropdown | Popover surface, shared elevation, green highlight with dark text. Radix retains keyboard navigation and disabled items. |
| Card | Static surface with border and subtle elevation. Hover is not applied to every card. Existing padding overrides remain supported. |
| Dialog / Modal | Popover surface, shared scrim, viewport-constrained scrolling; preserve Radix focus containment, Escape behavior, and accessible titles. Modal renders its optional description. |
| Table | Horizontal scrolling stays inside the table. ReusableDataTable shares Button/Select controls, marks the current page, announces loading, and disables navigation at boundaries. |
| Navigation / tabs | Muted inactive text, visible active state, `aria-current="page"` for links and `aria-expanded` for groups. Icon-only actions need labels. |
| Notifications | Import `toast` from Sonner; mount the single shared `components/ui/sonner` toaster. It uses the same semantic palette for every severity. |

For asynchronous actions use `disabled={pending}` and `aria-busy={pending}`,
keep a meaningful button label, and add `Loading` if needed. Spinners inherit
current text color so they remain visible on filled actions. Page loaders expose
a status even when visible text is omitted.

Use a 2px ring with a 2px offset for keyboard focus. Do not suppress focus rings
in callers. Keep disabled controls visibly distinct. Never use opacity alone to
communicate an error. Keep typography at least 16px in mobile text-entry fields.

### Example

```tsx
<Label htmlFor="name">Name</Label>
<Input id="name" variant="pill" aria-invalid={Boolean(error)}
  aria-describedby={error ? "name-error" : undefined} />
{error && <p id="name-error" role="alert" className="text-sm text-destructive">{error}</p>}
<Button type="submit" disabled={pending} aria-busy={pending}>
  {pending ? "Saving…" : "Save"}
</Button>
```

## Incremental migration audit

Scanned 153 TSX files, all 30 route pages and their layouts/loading states, the
single global stylesheet, theme wiring, and shared UI components.

| Area | Work completed |
| --- | --- |
| Foundation | Removed duplicate dark palette, corrected contrast pairs, defined token scales, enabled dark native controls and reduced motion |
| Shared UI | Unified controls, menus, overlays, card elevation, notifications, loading and focus states |
| Auth | Explicit pill variants, accessible password toggles, announced errors and named loading state |
| Dashboard / wealth / workouts | Replaced repeated neutral and status literals while preserving data, layout and calculation logic |
| Investment / crypto / stocks / trading | Migrated interface palette; retained chart data and vendor-specific colors |
| Subscriptions / memories / scheduler / settings | Migrated palette and existing pill controls; retained action handlers |
| PDF / video | Shared UI improvements; retained document, canvas and timeline-specific visuals |
| Navigation | Shared tokens and accessible names/current/expanded state |

Compatibility classes `card-spotify`, `btn-pill`, `spotify-input`, and
`text-spotify-*` remain only for existing wrappers, native fields, tabs, and
typography. They now use tokens. New Button/Input callers use variants.
Removed unused `card-modern`, `btn-primary`, `glow-green`, `gradient-text`,
`btn-circle-play`, `glow-spotify`, and the migrated `btn-pill-primary`.
Removed unused legacy text color variables that conflicted with Tailwind's type scale.

## Verification

Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.
The design regression tests check semantic text contrast (4.5:1), control/focus
contrast (3:1), empty-table navigation, current-page semantics, link composition,
input accessibility props, and loading announcements.

Browser checks use desktop and mobile widths, keyboard focus, open menus/dialogs,
invalid and disabled fields, loading/empty states, and notifications. Static
builds cover every route; authenticated page workflows require a signed-in
browser session. See `docs/design-system-verification.md` for this migration's
actual results and remaining verification limits.
