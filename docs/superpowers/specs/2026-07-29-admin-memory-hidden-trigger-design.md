# Admin Memory Hidden Trigger Design

## Goal

Provide an invisible click target directly below the displayed `Admin` role on `/dashboard/settings` that navigates to the Memory page.

## Scope

- Update the profile role display in `app/dashboard/settings/page.tsx`.
- Render the trigger only when `profile.role` resolves to `Admin`.
- Navigate to `/dashboard/memories` when the invisible target is clicked.
- Keep the target visually undetectable: no text, colour, icon, hover effect, or layout shift.

## Design

The role text remains unchanged. When the resolved role is `Admin`, render a small, transparent link immediately below it. The target has a fixed 8–12px height and spans only the role-label width so accidental activation is unlikely. It is not rendered for any other role.

Use the existing Next.js navigation pattern for an internal route. No data access, permission model, or Memory-page behavior changes are included.

## Validation

Add a focused automated test for the role-display component behavior: Admin renders a link to `/dashboard/memories`; non-Admin roles do not. Run the targeted test and the relevant project checks after implementation.
