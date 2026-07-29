# Admin Memory Hidden Trigger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a small invisible area beneath the `Admin` role on `/dashboard/settings` navigate to the Memory page.

**Architecture:** Keep the change local to the existing profile summary in the Settings page. The profile role badge continues to render as before; an internal Next.js `Link` is conditionally rendered only when the role is exactly `Admin`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Node.js built-in test runner.

---

## File Structure

- Modify: `app/dashboard/settings/page.tsx` — wrap the role badge and conditional invisible navigation target in a width-fitting container.
- Create: `tests/settings-memory-trigger.test.js` — source-level regression test that verifies the trigger’s destination, Admin-only condition, and transparent fixed-height styling using the project’s existing Node test runner.

### Task 1: Verify the Admin-only Memory trigger

**Files:**
- Create: `tests/settings-memory-trigger.test.js`
- Modify: `app/dashboard/settings/page.tsx:186-190`

- [ ] **Step 1: Write the failing test**

Create `tests/settings-memory-trigger.test.js`:

```js
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')

const settingsPage = fs.readFileSync(
  path.join(process.cwd(), 'app/dashboard/settings/page.tsx'),
  'utf8',
)

test('renders an invisible Memory link only for the Admin role', () => {
  assert.match(settingsPage, /profile\.role === "Admin"/)
  assert.match(settingsPage, /href="\/dashboard\/memories"/)
  assert.match(settingsPage, /className="block h-2 w-full bg-transparent"/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test tests/settings-memory-trigger.test.js
```

Expected: FAIL because the page does not yet contain the Admin-only Memory link.

- [ ] **Step 3: Write the minimal implementation**

In `app/dashboard/settings/page.tsx`, replace the existing role badge:

```tsx
            <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.2em] bg-primary text-black shadow-play">
              <Shield className="w-4 h-4" />
              {profile.role || "User"}
            </div>
```

with:

```tsx
            <div className="inline-block">
              <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.2em] bg-primary text-black shadow-play">
                <Shield className="w-4 h-4" />
                {profile.role || "User"}
              </div>
              {profile.role === "Admin" && (
                <Link
                  href="/dashboard/memories"
                  className="block h-2 w-full bg-transparent"
                  aria-label="Open Memory"
                />
              )}
            </div>
```

- [ ] **Step 4: Run the targeted test to verify it passes**

Run:

```powershell
node --test tests/settings-memory-trigger.test.js
```

Expected: PASS with one passing test.

- [ ] **Step 5: Run the project build**

Run:

```powershell
npm run build
```

Expected: Exit code 0 with Next.js production build completing successfully.

- [ ] **Step 6: Commit the implementation**

Run:

```powershell
git add -- app/dashboard/settings/page.tsx tests/settings-memory-trigger.test.js
git commit -m "feat: add admin memory trigger in settings"
```
