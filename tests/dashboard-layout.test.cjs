const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const load = require('./load-typescript.cjs')

function dashboard({ mobile = true, collapsed = false } = {}) {
  let pathname = '/dashboard/my-wealth/growth'
  let menuState
  let sidebarProps
  let desktopToggles = 0
  const { default: Layout } = load('app/dashboard/layout.tsx', {
    react: { ...React, useState: initial => {
      if (menuState === undefined) menuState = typeof initial === 'function' ? initial() : initial
      return [menuState, value => { menuState = typeof value === 'function' ? value(menuState) : value }]
    } },
    'next/navigation': { usePathname: () => pathname },
    '@/components/ui/use-mobile': { useIsMobile: () => mobile },
    '@/hooks/use-sidebar': { useSidebar: () => ({ isCollapsed: collapsed, toggle: () => { desktopToggles++ } }) },
    '@/components/sidebar': { Sidebar: props => { sidebarProps = props; return React.createElement('aside', { 'aria-label': props.isCollapsed ? 'Collapsed navigation' : 'Expanded navigation' }) } },
    '@/components/dashboard-header': { DashboardHeader: () => React.createElement('header', {}, 'Header') },
  })
  const render = () => {
    const element = React.createElement(Layout, {}, React.createElement('article', {}, 'Growth content'))
    return renderToStaticMarkup(element)
  }
  return {
    render,
    toggle: () => sidebarProps.onToggle(),
    navigate: value => { pathname = value },
    desktopToggles: () => desktopToggles,
  }
}

test('mobile dashboard starts with collapsed navigation independently of the desktop preference', () => {
  const view = dashboard({ mobile: true, collapsed: false })
  const html = view.render()
  assert.match(html, /aria-label="Collapsed navigation"/)
  assert.match(html, /w-16 shrink-0 md:w-auto/)
  assert.doesNotMatch(html, /aria-label="Close navigation"/)
})

test('mobile navigation opens over the page without changing its reserved rail width or desktop preference', () => {
  const view = dashboard()
  view.render()
  view.toggle()
  const html = view.render()
  assert.match(html, /aria-label="Expanded navigation"/)
  assert.match(html, /w-16 shrink-0 md:w-auto/)
  assert.match(html, /<button[^>]*aria-label="Close navigation"/)
  assert.match(html, /fixed inset-0[^"<>]*bg-overlay/)
  assert.match(html, /fixed inset-y-0 left-0 z-\[var\(--z-navigation\)\]/)
  assert.equal(view.desktopToggles(), 0)
  view.toggle()
  assert.match(view.render(), /aria-label="Collapsed navigation"/)
})

test('route navigation closes an open mobile menu', () => {
  const view = dashboard()
  view.render()
  view.toggle()
  assert.match(view.render(), /aria-label="Expanded navigation"/)
  view.navigate('/dashboard/my-wealth/workouts')
  const html = view.render()
  assert.match(html, /aria-label="Collapsed navigation"/)
  assert.doesNotMatch(html, /aria-label="Close navigation"/)
})

test('returning to a previous route keeps the mobile menu closed', () => {
  const view = dashboard()
  view.render()
  view.toggle()
  assert.match(view.render(), /aria-label="Expanded navigation"/)
  view.navigate('/dashboard/my-wealth/workouts')
  assert.match(view.render(), /aria-label="Collapsed navigation"/)
  view.navigate('/dashboard/my-wealth/growth')
  const html = view.render()
  assert.match(html, /aria-label="Collapsed navigation"/)
  assert.doesNotMatch(html, /aria-label="Close navigation"/)
})

test('desktop dashboard retains its saved navigation preference and original toggle', () => {
  for (const collapsed of [false, true]) {
    const view = dashboard({ mobile: false, collapsed })
    const html = view.render()
    assert.match(html, collapsed ? /aria-label="Collapsed navigation"/ : /aria-label="Expanded navigation"/)
    assert.doesNotMatch(html, /aria-label="Close navigation"/)
    view.toggle()
    assert.equal(view.desktopToggles(), 1)
  }
})
