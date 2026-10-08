import test from 'node:test'
import assert from 'node:assert/strict'
import {
  validateTrimRange,
  clamp,
  shortTime,
  timelineMarkers,
  formatBytes,
} from '../components/video-editor/edit-clip-utils.ts'

test('edit-clip-utils: validateTrimRange with valid range', () => {
  const res = validateTrimRange(1.5, 4.0, 10.0)
  assert.equal(res.valid, true)
  assert.equal(res.error, undefined)
})

test('edit-clip-utils: validateTrimRange rejects negative start', () => {
  const res = validateTrimRange(-1, 5, 10)
  assert.equal(res.valid, false)
  assert.match(res.error, /เริ่มต้นต้องไม่ต่ำกว่า/)
})

test('edit-clip-utils: validateTrimRange rejects start >= end', () => {
  const res1 = validateTrimRange(5, 5, 10)
  assert.equal(res1.valid, false)
  assert.match(res1.error, /สิ้นสุดต้องมากกว่า/)

  const res2 = validateTrimRange(6, 5, 10)
  assert.equal(res2.valid, false)
  assert.match(res2.error, /สิ้นสุดต้องมากกว่า/)
})

test('edit-clip-utils: validateTrimRange rejects end exceeding duration', () => {
  const res = validateTrimRange(0, 12, 10)
  assert.equal(res.valid, false)
  assert.match(res.error, /ไม่เกินความยาว/)
})

test('edit-clip-utils: validateTrimRange rejects non-finite numbers', () => {
  assert.equal(validateTrimRange(NaN, 5, 10).valid, false)
  assert.equal(validateTrimRange(0, Infinity, 10).valid, false)
})

test('edit-clip-utils: clamp, shortTime, timelineMarkers, formatBytes', () => {
  assert.equal(clamp(-5, 0, 100), 0)
  assert.equal(clamp(150, 0, 100), 100)
  assert.equal(clamp(50, 0, 100), 50)

  assert.equal(shortTime(0), '00:00')
  assert.equal(shortTime(65), '01:05')
  assert.equal(shortTime(3600), '60:00')

  assert.deepEqual(timelineMarkers(12), [0, 5, 10])
  assert.equal(formatBytes(1048576), '1.0 MB')
})

test('Undo/Redo: Ref-based transaction tracking prevents stale closures on pointerup', () => {
  // Simulating the page component ref & snapshot architecture
  const trimStartRef = { current: 0 }
  const trimEndRef = { current: 10 }
  const volumeRef = { current: 80 }
  const originalMutedRef = { current: false }
  const aspectRatioRef = { current: '9:16' }
  const outputNameRef = { current: 'clip' }

  const history = []
  const future = []
  let pendingBefore = null

  const getLatestSnapshot = () => ({
    trimStart: trimStartRef.current,
    trimEnd: trimEndRef.current,
    volume: volumeRef.current,
    originalMuted: originalMutedRef.current,
    aspectRatio: aspectRatioRef.current,
    outputName: outputNameRef.current,
  })

  const startTransaction = () => {
    if (!pendingBefore) {
      pendingBefore = getLatestSnapshot()
    }
  }

  const commitTransaction = () => {
    if (pendingBefore) {
      const before = pendingBefore
      const current = getLatestSnapshot()
      if (
        before.trimStart !== current.trimStart ||
        before.trimEnd !== current.trimEnd ||
        before.volume !== current.volume ||
        before.originalMuted !== current.originalMuted ||
        before.aspectRatio !== current.aspectRatio ||
        before.outputName !== current.outputName
      ) {
        history.push(before)
        future.length = 0
      }
      pendingBefore = null
    }
  }

  // PointerDown at t=0
  startTransaction()
  assert.equal(pendingBefore.trimStart, 0)

  // User drags slider to 2.0s -> ref updates synchronously
  trimStartRef.current = 2.0

  // PointerUp fires -> commitTransaction reads latest from ref
  commitTransaction()

  assert.equal(history.length, 1, 'History must record exactly 1 item after drag')
  assert.equal(history[0].trimStart, 0, 'Recorded snapshot before drag was 0s')
  assert.equal(trimStartRef.current, 2.0, 'Current state after drag is 2s')

  // Now Undo
  const previous = history.pop()
  future.push(getLatestSnapshot())
  trimStartRef.current = previous.trimStart

  assert.equal(trimStartRef.current, 0, 'Undo restores trimStart to 0s')
  assert.equal(future.length, 1)

  // Now Redo
  const next = future.pop()
  history.push(getLatestSnapshot())
  trimStartRef.current = next.trimStart

  assert.equal(trimStartRef.current, 2.0, 'Redo restores trimStart to 2.0s')
})

test('File Switch: Duration and trim reset immediately prevents stale duration export', () => {
  // Simulating state when switching from File A (60s) to File B (5s)
  let state = {
    selectedFile: 'file_a.mp4',
    uploadedPath: '/tmp/videos/file_a.mp4',
    uploadState: 'ready',
    metadataStatus: 'ready',
    duration: 60,
    trimStart: 0,
    trimEnd: 60,
  }

  const isReadyToExport = (s) =>
    s.uploadState === 'ready' &&
    Boolean(s.uploadedPath) &&
    s.metadataStatus === 'ready' &&
    s.duration > 0 &&
    validateTrimRange(s.trimStart, s.trimEnd, s.duration).valid

  assert.equal(isReadyToExport(state), true)

  // User picks File B -> Immediate reset
  state = {
    ...state,
    selectedFile: 'file_b.mp4',
    uploadedPath: null,
    uploadState: 'uploading',
    metadataStatus: 'loading',
    duration: 0,
    trimStart: 0,
    trimEnd: 0,
  }

  // While uploading or before metadata is loaded, readyToExport MUST be false
  assert.equal(isReadyToExport(state), false)

  // Suppose upload finishes BEFORE metadata loads:
  state.uploadState = 'ready'
  state.uploadedPath = '/tmp/videos/file_b.mp4'
  assert.equal(isReadyToExport(state), false, 'Cannot export while metadata is loading')

  // Suppose metadata fails in browser:
  state.metadataStatus = 'error'
  assert.equal(isReadyToExport(state), false, 'Cannot export if metadata errored')

  // Metadata successfully loads:
  state.metadataStatus = 'ready'
  state.duration = 5.0
  state.trimEnd = 5.0
  assert.equal(isReadyToExport(state), true, 'Ready to export with File B duration')
})
