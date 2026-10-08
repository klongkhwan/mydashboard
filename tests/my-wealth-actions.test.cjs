const test = require('node:test')
const assert = require('node:assert/strict')
const loadTypeScript = require('./load-typescript.cjs')

function actionsFor(results, user = { id: 'test-user' }) {
  const queries = []
  const actions = loadTypeScript('app/dashboard/my-wealth/actions.ts', {
    '@/utils/supabase/server': { createClient: async () => ({
      auth: { getUser: async () => ({ data: { user } }) },
      from: (table) => {
        const query = { table, filters: [] }
        queries.push(query)
        return {
          select() { return this },
          eq(key, value) { query.filters.push([key, value]); return this },
          order: async () => results[table],
        }
      },
    }) },
    'next/cache': { revalidatePath() {} },
    'next/navigation': { redirect: (url) => { throw new Error(`redirect:${url}`) } },
  })
  return { actions, queries }
}

test('wealth loads all three tables filtered to the signed-in user', async () => {
  const results = {
    wealth_categories: { data: [{ id: 'category' }], error: null },
    wealth_transactions: { data: [{ id: 'transaction' }], error: null },
    wealth_investments: { data: [{ id: 'investment' }], error: null },
  }
  const { actions, queries } = actionsFor(results)
  assert.deepEqual(await actions.getMyWealthData(), {
    categories: results.wealth_categories.data,
    transactions: results.wealth_transactions.data,
    investments: results.wealth_investments.data,
  })
  assert.equal(queries.length, 3)
  queries.forEach((query) => assert.deepEqual(query.filters, [['user_id', 'test-user']]))
})

test('wealth never turns a failed table query into a zero-balance dashboard', async () => {
  for (const table of ['wealth_categories', 'wealth_transactions', 'wealth_investments']) {
    const results = Object.fromEntries(['wealth_categories', 'wealth_transactions', 'wealth_investments'].map((name) => [name, { data: [], error: null }]))
    results[table] = { data: null, error: { message: 'Database unavailable', code: 'TEST' } }
    const { actions } = actionsFor(results)
    await assert.rejects(actions.getMyWealthData(), /ไม่สามารถโหลดข้อมูล/)
  }
})

test('wealth redirects to login only when no user is signed in', async () => {
  const { actions, queries } = actionsFor({}, null)
  await assert.rejects(actions.getMyWealthData(), /redirect:\/login/)
  assert.equal(queries.length, 0)
})
