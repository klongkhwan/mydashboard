const test = require('node:test')
const assert = require('node:assert/strict')
const loadTypeScript = require('./load-typescript.cjs')

function schema() {
  return loadTypeScript('app/dashboard/my-wealth/growth/schema.ts').growthLogSchema
}

const validInput = { activity_date: '2024-02-29', category: 'reading', title: '  อ่านหนังสือบทที่ 2  ' }

test('growth validates and normalizes an activity without optional fields', () => {
  assert.deepEqual(schema().parse(validInput), {
    activity_date: '2024-02-29', category: 'reading', title: 'อ่านหนังสือบทที่ 2',
    duration_minutes: null, notes: null,
  })
})

test('growth accepts only real calendar dates through today in Bangkok', () => {
  const value = schema()
  for (const activity_date of ['2023-02-29', '2024-04-31', '2024-13-01', '2024-00-12', '2024-01-00', '2024-1-02', '9999-12-31', '', '2024-02-29T00:00:00Z']) {
    assert.equal(value.safeParse({ ...validInput, activity_date }).success, false, activity_date)
  }
  const { getGrowthToday } = loadTypeScript('lib/personal-growth.ts')
  assert.equal(value.safeParse({ ...validInput, activity_date: getGrowthToday() }).success, true)
})

test('growth checks the current day at validation time rather than module load', () => {
  const domain = loadTypeScript('lib/personal-growth.ts')
  let today = '2026-10-22'
  const value = loadTypeScript('app/dashboard/my-wealth/growth/schema.ts', {
    '@/lib/personal-growth': { ...domain, getGrowthToday: () => today },
  }).growthLogSchema
  assert.equal(value.safeParse({ ...validInput, activity_date: '2026-10-23' }).success, false)
  today = '2026-10-23'
  assert.equal(value.safeParse({ ...validInput, activity_date: '2026-10-23' }).success, true)
})

test('growth validates categories and nonblank bounded text', () => {
  const value = schema()
  for (const category of ['reading', 'podcast', 'course', 'practice', 'other']) {
    assert.equal(value.safeParse({ ...validInput, category }).success, true)
  }
  for (const invalid of [{ category: 'exercise' }, { title: ' \n\t ' }, { title: 'a'.repeat(201) }, { notes: 'a'.repeat(2001) }]) {
    assert.equal(value.safeParse({ ...validInput, ...invalid }).success, false)
  }
  assert.equal(value.parse({ ...validInput, title: 'a'.repeat(200), notes: ' a lesson ' }).notes, 'a lesson')
})

test('growth converts empty optional values to null and accepts integer minute strings', () => {
  const value = schema()
  for (const duration_minutes of [undefined, null, '', '   ']) {
    assert.equal(value.parse({ ...validInput, duration_minutes }).duration_minutes, null)
  }
  for (const notes of [undefined, null, '', ' \n ']) {
    assert.equal(value.parse({ ...validInput, notes }).notes, null)
  }
  assert.equal(value.parse({ ...validInput, duration_minutes: '45' }).duration_minutes, 45)
  assert.equal(value.parse({ ...validInput, duration_minutes: 1440 }).duration_minutes, 1440)
})

test('growth rejects invalid minute values instead of silently coercing them', () => {
  const value = schema()
  for (const duration_minutes of [0, -1, 1.5, 1441, 'NaN', Infinity, true, [], {}, '1.2']) {
    assert.equal(value.safeParse({ ...validInput, duration_minutes }).success, false, String(duration_minutes))
  }
})

test('growth never accepts owner, identifiers, or timestamps from activity input', () => {
  const result = schema().safeParse({ ...validInput, user_id: 'other-user', id: 'chosen-id', created_at: '2024-01-01' })
  if (result.success) {
    assert.equal(Object.hasOwn(result.data, 'user_id'), false)
    assert.equal(Object.hasOwn(result.data, 'id'), false)
    assert.equal(Object.hasOwn(result.data, 'created_at'), false)
  } else {
    assert.ok(result.error.issues.length > 0)
  }
})
