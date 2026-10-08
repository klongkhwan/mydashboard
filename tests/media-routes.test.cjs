const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { randomUUID } = require('node:crypto')
const { NextRequest } = require('next/server')
const loadTypeScript = require('./load-typescript.cjs')
const { POST: upload } = loadTypeScript('app/api/video/upload/route.ts')
const { GET: stream } = loadTypeScript('app/api/video/stream/route.ts')
const { safeMediaPath } = loadTypeScript('lib/media-paths.ts')
const fixture = path.resolve('tmp/videos', `range-test-${randomUUID()}.mp4`)

test.before(() => {
  fs.mkdirSync(path.dirname(fixture), { recursive: true })
  fs.writeFileSync(fixture, '0123456789')
})
test.after(() => fs.rmSync(fixture, { force: true }))

function requestForRange(range) {
  return new NextRequest(`http://localhost/api/video/stream?path=${encodeURIComponent(fixture)}`, { headers: range ? { range } : {} })
}

test('stream returns the full file and valid closed/open/suffix byte ranges', async () => {
  for (const [range, status, body, contentRange] of [
    [undefined, 200, '0123456789', null],
    ['bytes=2-5', 206, '2345', 'bytes 2-5/10'],
    ['bytes=7-', 206, '789', 'bytes 7-9/10'],
    ['bytes=-4', 206, '6789', 'bytes 6-9/10'],
    ['bytes=-50', 206, '0123456789', 'bytes 0-9/10'],
    ['bytes=8-50', 206, '89', 'bytes 8-9/10'],
  ]) {
    const response = await stream(requestForRange(range))
    assert.equal(response.status, status, range)
    assert.equal(await response.text(), body, range)
    assert.equal(response.headers.get('content-range'), contentRange, range)
    assert.equal(Number(response.headers.get('content-length')), body.length, range)
  }
})

test('stream rejects unsatisfiable ranges with 416 instead of clamping or crashing', async () => {
  for (const range of ['bytes=10-', 'bytes=20-30', 'bytes=5-2', 'bytes=-0']) {
    const response = await stream(requestForRange(range))
    assert.equal(response.status, 416, range)
    assert.equal(response.headers.get('content-range'), 'bytes */10', range)
  }
})

test('stream ignores malformed or multiple ranges and sends the whole file', async () => {
  for (const range of ['invalid', 'bytes=abc-def', 'bytes=1-2,5-6', 'bytes=-']) {
    const response = await stream(requestForRange(range))
    assert.equal(response.status, 200, range)
    assert.equal(await response.text(), '0123456789', range)
  }
})

test('media paths must refer to files, not directories or locations outside tmp', () => {
  assert.equal(safeMediaPath(path.dirname(fixture)), null)
  assert.equal(safeMediaPath(path.resolve('package.json')), null)
  assert.equal(safeMediaPath(fixture), fixture)
})

test('parallel uploads with identical names keep each file intact', async () => {
  const name = `collision-test-${randomUUID()}.mp4`
  const paths = new Set()
  let ready = 0
  let release
  const bothReading = new Promise((resolve) => { release = resolve })
  try {
    const results = await Promise.all(['first video', 'second video'].map(async (contents) => {
      const data = new FormData()
      const file = new File([contents], name, { type: 'video/mp4' })
      const read = file.arrayBuffer.bind(file)
      file.arrayBuffer = async () => {
        if (++ready === 2) release()
        await bothReading
        return read()
      }
      data.set('file', file)
      const response = await upload({ formData: async () => data })
      assert.equal(response.status, 200)
      const result = await response.json()
      paths.add(result.path)
      return { ...result, contents }
    }))
    assert.equal(paths.size, 2)
    for (const result of results) assert.equal(fs.readFileSync(result.path, 'utf8'), result.contents)
  } finally {
    for (const file of paths) fs.rmSync(file, { force: true })
  }
})

test('upload rejects a text form field and an empty file with 400', async () => {
  for (const value of ['not a file', new File([], 'empty.mp4')]) {
    const data = new FormData()
    data.set('file', value)
    const response = await upload(new NextRequest('http://localhost/api/video/upload', { method: 'POST', body: data }))
    assert.equal(response.status, 400)
  }
})
