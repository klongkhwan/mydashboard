const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const postcss = require('postcss')

const tokens = {}
postcss.parse(fs.readFileSync('styles/globals.css', 'utf8')).walkRules(':root', rule => {
  rule.walkDecls(decl => { tokens[decl.prop] = decl.value })
})

function luminance(token) {
  const value = tokens[`--${token}`]
  assert.match(value, /^#[\da-f]{6}$/i, `${token} must resolve to a six-digit color`)
  const rgb = value.slice(1).match(/../g).map(channel => {
    const s = parseInt(channel, 16) / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
}

function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

for (const surface of ['background', 'card', 'popover', 'primary', 'secondary', 'accent', 'destructive']) {
  test(`${surface} text meets WCAG AA contrast`, () => {
    const text = surface === 'background' ? 'foreground' : `${surface}-foreground`
    assert.ok(contrast(surface, text) >= 4.5, `${surface}/${text}: ${contrast(surface, text).toFixed(2)}:1`)
  })
}

test('muted text remains readable on every neutral surface', () => {
  for (const surface of ['background', 'card', 'popover', 'muted']) {
    assert.ok(contrast(surface, 'muted-foreground') >= 4.5, surface)
  }
})

test('input boundaries and focus indicators remain distinguishable', () => {
  for (const surface of ['background', 'card', 'popover']) {
    assert.ok(contrast(surface, 'input') >= 3, `input border on ${surface}`)
    assert.ok(contrast(surface, 'ring') >= 3, `focus ring on ${surface}`)
  }
})
