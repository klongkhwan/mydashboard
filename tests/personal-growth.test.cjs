const test = require('node:test')
const assert = require('node:assert/strict')
const load = require('./load-typescript.cjs')

const growth = () => load('lib/personal-growth.ts')
const log = (activity_date, id = activity_date) => ({ id, activity_date })

test('growth uses Bangkok midnight even when UTC is still the previous day', () => {
  const { getGrowthToday } = growth()
  assert.equal(getGrowthToday(new Date('2026-10-22T16:59:59Z')), '2026-10-22')
  assert.equal(getGrowthToday(new Date('2026-10-22T17:00:00Z')), '2026-10-23')
  assert.equal(getGrowthToday(new Date('2026-12-31T17:00:00Z')), '2027-01-01')
})

test('only real YYYY-MM-DD dates are valid, including leap years', () => {
  const { isGrowthDate } = growth()
  for (const date of ['2024-02-29', '2026-10-23', '2000-02-29']) assert.equal(isGrowthDate(date), true, date)
  for (const date of ['2026-02-29', '2026-04-31', '2026-13-01', '0000-01-01', '2026-1-01', 'nope', '2026-10-23T00:00:00Z']) {
    assert.equal(isGrowthDate(date), false, date)
  }
})

test('date-only arithmetic crosses month, year, and leap day boundaries', () => {
  const { shiftGrowthDate } = growth()
  assert.equal(shiftGrowthDate('2026-01-01', -1), '2025-12-31')
  assert.equal(shiftGrowthDate('2024-03-01', -1), '2024-02-29')
  assert.equal(shiftGrowthDate('2026-10-23', -6), '2026-10-17')
})

test('multiple activities in one day count once; all history drives cumulative progress', () => {
  const { calculateGrowthStats } = growth()
  const logs = [log('2026-10-23', 'a'), log('2026-10-23', 'b'), log('2026-10-17'), log('2026-10-16'), log('2026-09-30'), log('2024-01-01')]
  assert.deepEqual(calculateGrowthStats(logs, '2026-10-23'), {
    activeDays: 5, monthDays: 3, last7Days: 2, totalActivities: 6,
  })
})

test('moving dates and deleting the last log on a date recomputes growth from real records', () => {
  const { calculateGrowthStats } = growth()
  const logs = [log('2026-10-22', 'a'), log('2026-10-23', 'b')]
  assert.equal(calculateGrowthStats(logs, '2026-10-23').activeDays, 2)
  assert.equal(calculateGrowthStats([logs[0], { ...logs[1], activity_date: '2026-10-22' }], '2026-10-23').activeDays, 1)
  assert.equal(calculateGrowthStats(logs.slice(1), '2026-10-23').activeDays, 1)
  assert.equal(calculateGrowthStats([], '2026-10-23').activeDays, 0)
})

test('rest does not remove progress; future and invalid dates do not enter stats', () => {
  const { calculateGrowthStats } = growth()
  assert.deepEqual(calculateGrowthStats([log('2024-01-01'), log('2026-10-24'), log('2026-02-30')], '2026-10-23'), {
    activeDays: 1, monthDays: 0, last7Days: 0, totalActivities: 1,
  })
})

test('all five stage boundaries are exact and progress continues after the final stage', () => {
  const { getGrowthStage } = growth()
  for (const [days, expected] of [[0, 0], [6, 0], [7, 1], [29, 1], [30, 2], [89, 2], [90, 3], [179, 3], [180, 4], [400, 4]]) {
    assert.equal(getGrowthStage(days), expected, String(days))
  }
})
