import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { formatDateDDMMYYYY } from '../components/dashboard/format.ts'

describe('formatDateDDMMYYYY', () => {
  it('formats YYYY-MM-DD string to DD/MM/YYYY', () => {
    assert.equal(formatDateDDMMYYYY('2026-10-20'), '20/10/2026')
    assert.equal(formatDateDDMMYYYY('2026-03-05'), '05/03/2026')
  })

  it('formats ISO string to DD/MM/YYYY', () => {
    assert.equal(formatDateDDMMYYYY('2026-12-31T23:59:59.000Z'), '31/12/2026')
  })

  it('formats Date object to DD/MM/YYYY', () => {
    const d = new Date(2026, 9, 20) // October 20, 2026 in local time
    assert.equal(formatDateDDMMYYYY(d), '20/10/2026')
  })

  it('handles null, undefined, and empty string safely', () => {
    assert.equal(formatDateDDMMYYYY(null), '-')
    assert.equal(formatDateDDMMYYYY(undefined), '-')
    assert.equal(formatDateDDMMYYYY(''), '-')
    assert.equal(formatDateDDMMYYYY('   '), '-')
  })
})
