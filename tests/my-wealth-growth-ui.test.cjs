const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const load = require('./load-typescript.cjs')
const { GrowthCharacter } = load('components/my-wealth/growth-character.tsx')
const { GrowthActivityHeatmap } = load('components/my-wealth/growth-activity-heatmap.tsx')
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props))

test('the shared growth date picker exposes its label and validation on the visible control', () => {
  const { DatePicker } = load('components/ui/date-picker.tsx', { 'react-day-picker/style.css': {} })
  const html = render(DatePicker, {
    id: 'growth-activity_date', value: new Date(2026, 9, 23),
    'aria-invalid': true, 'aria-describedby': 'growth-date-error', disabled: true,
  })
  const button = html.match(/<button[^>]*>/)[0]
  assert.match(button, /id="growth-activity_date"/)
  assert.match(button, /aria-invalid="true"/)
  assert.match(button, /aria-describedby="growth-date-error"/)
  assert.match(button, /disabled=""/)
  assert.match(html, /23\/10\/2026/)
})

test('growth character describes progress and keeps cumulative days after the last stage', () => {
  const eighteen = render(GrowthCharacter, { activeDays: 18, celebrationKey: 0 })
  assert.match(eighteen, /Building Habits/)
  assert.match(eighteen, /อีก 12 วันถึงขั้นถัดไป/)
  assert.match(eighteen, /role="img" aria-labelledby=/)
  assert.doesNotMatch(eighteen, /class="growth-celebrate"/)
  assert.match(eighteen, /prefers-reduced-motion: reduce/)
  const final = render(GrowthCharacter, { activeDays: 365, celebrationKey: 0 })
  assert.match(final, /Long-term Growth/)
  assert.match(final, />365<\/span> วัน/)
  assert.match(final, /เติบโตต่อไปได้ทุกวัน/)
})

test('heatmap shows all activities per date, five intensity levels, and disables future days', () => {
  const html = render(GrowthActivityHeatmap, {
    logs: [...Array(5)].map((_, index) => ({ id: String(index), activity_date: '2026-10-23' })),
    today: '2026-10-23', onSelectDate() {},
  })
  const today = html.match(/<button[^>]*aria-current="date"[^>]*>/)[0]
  assert.match(today, /5 activities · View Activities/)
  assert.match(today, /bg-primary /)
  assert.doesNotMatch(today, /disabled/)
  assert.match(html, /disabled=""[^>]*aria-label="24\/10\/2026: ยังมาไม่ถึง"/)
  assert.match(html, /0 activities · Log Activity/)
  assert.match(html, /Activity levels: 0, 1, 2, 3 and 4 or more activities/)
  assert.equal((html.match(/<button/g) || []).length, 84)
})

test('heatmap omits a short leading month label before the next month', () => {
  const html = render(GrowthActivityHeatmap, { logs: [], today: '2026-08-21', onSelectDate() {} })
  assert.match(html, /31\/05\/2026/)
  assert.doesNotMatch(html, />May<\/span>/)
  assert.match(html, />Jun<\/span>/)
})
