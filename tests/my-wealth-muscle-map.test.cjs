const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const load = require('./load-typescript.cjs')
const { MuscleMap } = load('components/my-wealth/muscle-map.tsx')

test('both body views have accessible names and descriptions, including without workouts', () => {
  const html = renderToStaticMarkup(React.createElement(MuscleMap, { workouts: [] }))
  const diagrams = html.match(/<svg\b[^>]*role="img"[\s\S]*?<\/svg>/g) || []
  assert.equal(diagrams.length, 2)
  for (const [index, diagram] of diagrams.entries()) {
    const titleId = diagram.match(/aria-labelledby="([^"]+)"/)?.[1]
    const descriptionId = diagram.match(/aria-describedby="([^"]+)"/)?.[1]
    assert.ok(titleId, 'each body view needs an accessible name')
    assert.ok(descriptionId, 'each body view needs a description of the workout data')
    assert.ok(diagram.includes(`<title id="${titleId}">${index === 0 ? 'Front' : 'Back'}`))
    assert.ok(diagram.includes(`<desc id="${descriptionId}">`))
    assert.match(diagram, /Chest: 0 sets/)
  }
})

test('multiple muscle maps keep all SVG references local and IDs unique', () => {
  const html = renderToStaticMarkup(React.createElement('div', null,
    React.createElement(MuscleMap, { workouts: [] }),
    React.createElement(MuscleMap, { workouts: [] }),
  ))
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1])
  assert.ok(ids.length > 0, 'shaded figures need their own SVG definitions')
  assert.equal(new Set(ids).size, ids.length)
  for (const diagram of html.match(/<svg\b[\s\S]*?<\/svg>/g) || []) {
    const localIds = new Set([...diagram.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]))
    for (const [, reference] of diagram.matchAll(/url\(#([^)]+)\)/g)) {
      assert.ok(localIds.has(reference), `SVG reference ${reference} must resolve inside its own figure`)
    }
  }
})
