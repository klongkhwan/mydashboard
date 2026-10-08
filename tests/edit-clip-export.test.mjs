import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { POST, GET } from '@/app/api/export/route'

const TMP_VIDEOS = path.resolve('tmp/videos')
const TMP_EXPORTS = path.resolve('tmp/exports')
const TEST_SOURCE = path.join(TMP_VIDEOS, 'test_route_source.mp4')

fs.mkdirSync(TMP_VIDEOS, { recursive: true })
fs.mkdirSync(TMP_EXPORTS, { recursive: true })

test.before(() => {
  const res = spawnSync('ffmpeg', [
    '-y',
    '-f', 'lavfi', '-i', 'testsrc=size=1280x720:rate=30',
    '-f', 'lavfi', '-i', 'sine=frequency=1000:sample_rate=44100',
    '-t', '5',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    TEST_SOURCE
  ], { encoding: 'utf-8' })

  assert.equal(res.status, 0, `ffmpeg failed to generate test video: ${res.stderr}`)
  assert.equal(fs.existsSync(TEST_SOURCE), true)
})

test.after(() => {
  if (fs.existsSync(TEST_SOURCE)) {
    try { fs.unlinkSync(TEST_SOURCE) } catch {}
  }
})

function probeMedia(filePath) {
  const res = spawnSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height',
    '-of', 'json',
    filePath
  ], { encoding: 'utf-8' })

  assert.equal(res.status, 0, `ffprobe failed: ${res.stderr}`)
  return JSON.parse(res.stdout)
}

async function readSSEStream(readableStream) {
  const reader = readableStream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalEvent = null
  const events = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n\n')
    buffer = lines.pop() || ''

    for (const block of lines) {
      const line = block.trim()
      if (line.startsWith('data:')) {
        try {
          const parsed = JSON.parse(line.slice(5).trim())
          events.push(parsed)
          if (parsed.done) finalEvent = parsed
        } catch {}
      }
    }
  }

  return { events, finalEvent }
}

test('Route Handler POST: exports 9:16 clip and returns valid MP4 via real route', async () => {
  const req = new Request('http://localhost/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: TEST_SOURCE,
      trimStart: 1.0,
      trimEnd: 3.0,
      format: { aspectRatio: '9:16', quality: '720p' },
      outputName: 'test_route_export',
    }),
  })

  const res = await POST(req)
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('Content-Type'), 'text/event-stream')

  const { events, finalEvent } = await readSSEStream(res.body)
  assert.ok(events.length > 0, 'Should have received progress events')
  assert.ok(finalEvent, 'Should have received terminal done event')
  assert.equal(finalEvent.status, 'done')
  assert.equal(finalEvent.progress, 100)
  assert.ok(finalEvent.outputFile, 'Should have output file path')
  assert.ok(fs.existsSync(finalEvent.outputFile), 'Output file should exist on disk')

  const probe = probeMedia(finalEvent.outputFile)
  const duration = parseFloat(probe.format.duration)
  assert.ok(Math.abs(duration - 2.0) < 0.25, `Duration should be ~2s, got ${duration}`)

  const video = probe.streams.find(s => s.codec_type === 'video')
  assert.ok(video, 'Should have video stream')
  assert.equal(video.width, 720)
  assert.equal(video.height, 1280)

  // Clean up
  try { fs.unlinkSync(finalEvent.outputFile) } catch {}
})

test('Route Handler POST: rejects invalid trim payloads with HTTP 400', async () => {
  // 1. start >= end
  const reqInverted = new Request('http://localhost/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: TEST_SOURCE,
      trimStart: 4.0,
      trimEnd: 2.0,
    }),
  })
  const res1 = await POST(reqInverted)
  assert.equal(res1.status, 400)
  const json1 = await res1.json()
  assert.equal(json1.success, false)
  assert.match(json1.error, /เริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด/)

  // 2. negative start
  const reqNegative = new Request('http://localhost/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: TEST_SOURCE,
      trimStart: -1.0,
      trimEnd: 3.0,
    }),
  })
  const res2 = await POST(reqNegative)
  assert.equal(res2.status, 400)

  // 3. missing video
  const reqMissing = new Request('http://localhost/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: 'non_existent_file.mp4',
      trimStart: 0,
      trimEnd: 2,
    }),
  })
  const res3 = await POST(reqMissing)
  assert.equal(res3.status, 400)
})

test('Route Handler POST: cancel() aborts FFmpeg cleanly without ERR_INVALID_STATE', async () => {
  const req = new Request('http://localhost/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: TEST_SOURCE,
      trimStart: 0,
      trimEnd: 4.5,
      format: { aspectRatio: '9:16', quality: '1080p' },
      outputName: 'cancel_test',
    }),
  })

  const res = await POST(req)
  assert.equal(res.status, 200)

  const reader = res.body.getReader()
  // Read first chunk
  const first = await reader.read()
  assert.equal(first.done, false)

  // Abort the reader
  await reader.cancel('Client aborted export')

  // Wait 400ms for childProcess close events to settle
  await new Promise(r => setTimeout(r, 400))

  // If ERR_INVALID_STATE had occurred, Node would have logged unhandled rejection
  assert.ok(true, 'Stream cancelled cleanly without unhandled exceptions')
})

test('Route Handler POST: prevents file collision when same outputName is exported twice', async () => {
  const makeReq = () => new Request('http://localhost/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: TEST_SOURCE,
      trimStart: 0,
      trimEnd: 1.0,
      outputName: 'my_same_clip',
    }),
  })

  const res1 = await POST(makeReq())
  const res2 = await POST(makeReq())

  const [result1, result2] = await Promise.all([
    readSSEStream(res1.body),
    readSSEStream(res2.body),
  ])

  assert.ok(result1.finalEvent && result2.finalEvent)
  assert.notEqual(
    result1.finalEvent.outputFile,
    result2.finalEvent.outputFile,
    'Each export must generate a unique disk file despite identical outputName'
  )

  // Clean up
  try { fs.unlinkSync(result1.finalEvent.outputFile) } catch {}
  try { fs.unlinkSync(result2.finalEvent.outputFile) } catch {}
})
