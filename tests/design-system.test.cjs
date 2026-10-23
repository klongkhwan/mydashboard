const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const load = require('./load-typescript.cjs')
const { ReusableDataTable } = load('components/ui/reusable-data-table.tsx')
const { Button } = load('components/ui/button.tsx')
const { Input } = load('components/ui/input.tsx')
const { ModernPageLoading } = load('components/ui/modern-loader.tsx')
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props))

test('an empty local table cannot navigate to a nonexistent next page', () => {
  const html = render(ReusableDataTable, { columns: [{ accessorKey: 'name', header: 'Name' }], data: [], manualPagination: false })
  const next = html.match(/<button\b[^>]*>\s*NEXT\s*<\/button>/)[0]
  assert.match(next, /disabled=""/)
})

test('table pagination identifies the current page to assistive technology', () => {
  const html = render(ReusableDataTable, { columns: [{ accessorKey: 'name', header: 'Name' }], data: [{ name: 'Example' }], totalCount: 30 })
  assert.match(html, /aria-current="page"/)
})

test('button composition preserves a single accessible link', () => {
  const html = render(Button, { asChild: true, children: React.createElement('a', { href: '/dashboard' }, 'Dashboard') })
  assert.match(html, /^<a /)
  assert.doesNotMatch(html, /<button/)
  assert.match(html, /href="\/dashboard"/)
})

test('input variants preserve validation and disabled semantics without leaking props', () => {
  const html = render(Input, { variant: 'pill', disabled: true, 'aria-invalid': true, 'aria-describedby': 'field-error' })
  assert.match(html, /disabled=""/)
  assert.match(html, /aria-invalid="true"/)
  assert.match(html, /aria-describedby="field-error"/)
  assert.doesNotMatch(html, /variant=/)
})

test('page loading has an accessible status even without visible text', () => {
  assert.match(render(ModernPageLoading, {}), /role="status" aria-label="Loading"/)
})
