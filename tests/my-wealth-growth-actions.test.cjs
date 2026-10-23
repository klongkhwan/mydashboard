const test = require('node:test')
const assert = require('node:assert/strict')
const loadTypeScript = require('./load-typescript.cjs')

const user = { id: '11111111-1111-4111-8111-111111111111' }
const id = '22222222-2222-4222-8222-222222222222'
const input = { activity_date: '2024-02-29', category: 'reading', title: '  Read a chapter  ', duration_minutes: '20', notes: '  Main idea  ' }
const row = {
  id, user_id: user.id, activity_date: '2024-02-29', category: 'reading', title: 'Read a chapter',
  duration_minutes: 20, notes: 'Main idea', created_at: '2024-02-29T01:00:00Z', updated_at: '2024-02-29T01:00:00Z',
}

function actionsFor(results = [], options = {}) {
  const queries = []
  const revalidations = []
  let queryCount = 0
  const actions = loadTypeScript('app/dashboard/my-wealth/growth/actions.ts', {
    '@/utils/supabase/server': { createClient: async () => ({
      auth: { getUser: async () => ({ data: { user: options.signedIn === false ? null : user }, error: options.authError ?? null }) },
      from(table) {
        const query = { table, filters: [], orders: [] }
        queries.push(query)
        const index = queryCount++
        const result = () => typeof results === 'function' ? results(query, index) : results[index] ?? { data: [], error: null }
        return {
          select(columns = '*') { query.select = columns; return this },
          insert(value) { query.operation = 'insert'; query.value = value; return this },
          update(value) { query.operation = 'update'; query.value = value; return this },
          delete() { query.operation = 'delete'; return this },
          eq(key, value) { query.filters.push([key, value]); return this },
          order(key, config) { query.orders.push([key, config]); return this },
          range(from, to) { query.range = [from, to]; return this },
          single() { query.single = true; return Promise.resolve(result()) },
          then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject) },
        }
      },
    }) },
    'next/cache': { revalidatePath: (...args) => revalidations.push(args) },
    'next/navigation': { redirect: (path) => { throw new Error(`redirect:${path}`) } },
  })
  return { actions, queries, revalidations }
}

test('growth loads every page scoped to the signed-in user in stable descending order', async () => {
  const firstPage = Array.from({ length: 1000 }, (_, i) => ({ ...row, id: `first-${i}` }))
  const lastRow = { ...row, id: 'last' }
  const { actions, queries } = actionsFor([{ data: firstPage, error: null }, { data: [lastRow], error: null }])
  const logs = await actions.getMyGrowthLogs()
  assert.equal(logs.length, 1001)
  assert.equal(logs[1000].id, 'last')
  assert.equal(queries.length, 2)
  assert.deepEqual(queries.map(query => query.range), [[0, 999], [1000, 1999]])
  for (const query of queries) {
    assert.equal(query.table, 'wealth_growth_logs')
    assert.deepEqual(query.filters, [['user_id', user.id]])
    assert.deepEqual(query.orders, [['activity_date', { ascending: false }], ['created_at', { ascending: false }], ['id', { ascending: false }]])
  }
})

test('growth distinguishes an empty history from a failed page', async () => {
  assert.deepEqual(await actionsFor().actions.getMyGrowthLogs(), [])
  const failed = actionsFor([{ data: Array(1000).fill(row), error: null }, { data: null, error: { message: 'Database unavailable' } }])
  await assert.rejects(failed.actions.getMyGrowthLogs(), /ไม่สามารถโหลดข้อมูล/)
})

test('growth redirects all unauthenticated CRUD calls before accessing data', async () => {
  for (const call of [a => a.getMyGrowthLogs(), a => a.createGrowthLog(input), a => a.updateGrowthLog(id, input), a => a.deleteGrowthLog(id)]) {
    const { actions, queries } = actionsFor([], { signedIn: false })
    await assert.rejects(call(actions), /redirect:\/login/)
    assert.equal(queries.length, 0)
  }
})

test('growth never uses a user returned alongside an authentication error', async () => {
  const { actions, queries } = actionsFor([], { authError: { message: 'Auth service unavailable' } })
  await assert.rejects(actions.getMyGrowthLogs())
  assert.equal(queries.length, 0)
})

test('growth creates a normalized activity owned by the session and returns the saved row', async () => {
  const { actions, queries, revalidations } = actionsFor([{ data: row, error: null }])
  const created = await actions.createGrowthLog({ ...input, user_id: 'attacker', id: 'attacker' })
  assert.deepEqual(created, row)
  assert.deepEqual(queries[0].value, {
    activity_date: '2024-02-29', category: 'reading', title: 'Read a chapter', duration_minutes: 20, notes: 'Main idea', user_id: user.id,
  })
  assert.equal(queries[0].operation, 'insert')
  assert.equal(queries[0].single, true)
  assert.deepEqual(revalidations, [['/dashboard/my-wealth/growth']])
})

test('growth updates only the requested row belonging to the session', async () => {
  const { actions, queries, revalidations } = actionsFor([{ data: row, error: null }])
  assert.deepEqual(await actions.updateGrowthLog(id, input), row)
  assert.equal(queries[0].operation, 'update')
  assert.deepEqual(queries[0].filters, [['id', id], ['user_id', user.id]])
  assert.equal(Object.hasOwn(queries[0].value, 'user_id'), false)
  assert.equal(queries[0].single, true)
  assert.deepEqual(revalidations, [['/dashboard/my-wealth/growth']])
})

test('growth deletes only the requested row belonging to the session and confirms a row was deleted', async () => {
  const { actions, queries, revalidations } = actionsFor([{ data: { id }, error: null }])
  assert.equal(await actions.deleteGrowthLog(id), undefined)
  assert.equal(queries[0].operation, 'delete')
  assert.deepEqual(queries[0].filters, [['id', id], ['user_id', user.id]])
  assert.equal(queries[0].select, 'id')
  assert.equal(queries[0].single, true)
  assert.deepEqual(revalidations, [['/dashboard/my-wealth/growth']])
})

test('growth rejects missing or unowned rows instead of reporting successful updates and deletes', async () => {
  for (const call of [a => a.updateGrowthLog(id, input), a => a.deleteGrowthLog(id)]) {
    const { actions, revalidations } = actionsFor([{ data: null, error: null }])
    await assert.rejects(call(actions))
    assert.deepEqual(revalidations, [])
  }
})

test('growth never reports a failed write as successful or revalidates its page', async () => {
  for (const call of [a => a.createGrowthLog(input), a => a.updateGrowthLog(id, input), a => a.deleteGrowthLog(id)]) {
    const { actions, revalidations } = actionsFor([{ data: null, error: { message: 'Write failed' } }])
    await assert.rejects(call(actions), /Write failed/)
    assert.deepEqual(revalidations, [])
  }
})

test('growth rejects invalid activity input and invalid identifiers before contacting the database', async () => {
  for (const call of [
    a => a.createGrowthLog({ ...input, title: '   ' }),
    a => a.updateGrowthLog(id, { ...input, activity_date: '2024-02-30' }),
    a => a.updateGrowthLog('not-a-uuid', input),
    a => a.deleteGrowthLog('not-a-uuid'),
  ]) {
    const { actions, queries, revalidations } = actionsFor()
    await assert.rejects(call(actions))
    assert.equal(queries.length, 0)
    assert.deepEqual(revalidations, [])
  }
})
