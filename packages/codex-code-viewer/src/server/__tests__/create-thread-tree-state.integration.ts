import {mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {once} from 'node:events'
import {Worker} from 'node:worker_threads'
import {build} from 'esbuild'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createThreadTreeState} from '../create-thread-tree-state'

const threadId = '01a119e7-be97-7020-930b-7049fb95be38'
const other = '01a11020-8962-72f1-8735-2a87c41aba83'
let home: string
beforeEach(() => {
  home = realpathSync(mkdtempSync(join(tmpdir(), 'viewer-tree-state-')))
})
afterEach(() => {
  vi.restoreAllMocks()
  rmSync(home, {force: true, recursive: true})
})

it('should restore explicit closed states after restart and isolate chats and workspaces', () => {
  const store = createThreadTreeState(home)
  expect(
    store.write({threadId}, '/project', {expanded: ['src', 'src/nested'], visible: true}).ok,
  ).toBe(true)
  expect(store.write({threadId}, '/project', {visible: false}).ok).toBe(true)
  const restarted = createThreadTreeState(home)
  expect(restarted.read({threadId}, '/project')).toEqual({
    ok: true,
    value: {expanded: ['src', 'src/nested'], visible: false},
  })
  expect(restarted.read({threadId: other}, '/project')).toEqual({ok: true, value: undefined})
  expect(restarted.read({threadId}, '/other')).toEqual({ok: true, value: undefined})
  expect(restarted.write({threadId}, '/project', {expanded: []}).ok).toBe(true)
  expect(store.read({threadId}, '/project')).toEqual({
    ok: true,
    value: {expanded: [], visible: false},
  })
})

it.each([undefined, {}, {threadId: '../outside'}])(
  'should refuse writes without a chat identity %j',
  (metadata) => {
    const store = createThreadTreeState(home)
    expect(store.write(metadata, '/project', {visible: true})).toMatchObject({
      error: {code: 'thread-unavailable'},
      ok: false,
    })
    expect(store.read(metadata, '/project')).toEqual({ok: true, value: undefined})
  },
)

it('should report storage failures', () => {
  writeFileSync(join(home, 'code-viewer'), 'blocked')
  expect(createThreadTreeState(home).write({threadId}, '/project', {visible: true})).toMatchObject({
    ok: false,
  })
})

it.each(['{', '{"visible":"false"}'])(
  'should replace an invalid preference on the next write: %s',
  (serialized) => {
    vi.spyOn(console, 'error').mockImplementation(vi.fn())
    const store = createThreadTreeState(home)
    store.write({threadId}, '/project', {visible: false})
    const directory = join(home, 'code-viewer', 'trees')
    for (const file of readdirSync(directory)) {
      writeFileSync(join(directory, file), serialized)
    }
    expect(store.read({threadId}, '/project')).toEqual({ok: true, value: undefined})
    expect(store.write({threadId}, '/project', {expanded: [], visible: true})).toEqual({
      ok: true,
      value: {expanded: [], visible: true},
    })
    expect(createThreadTreeState(home).read({threadId}, '/project')).toEqual({
      ok: true,
      value: {expanded: [], visible: true},
    })
  },
)

it('should preserve legacy snapshots while independently overriding their fields', () => {
  const directory = join(home, 'code-viewer', 'trees')
  mkdirSync(directory, {recursive: true})
  const digest = createHash('sha256').update('/project').digest('hex')
  writeFileSync(
    join(directory, `${threadId}-${digest}.json`),
    JSON.stringify({expanded: ['src'], visible: true}),
  )
  const store = createThreadTreeState(home)
  expect(store.read({threadId}, '/project')).toEqual({
    ok: true,
    value: {expanded: ['src'], visible: true},
  })
  expect(store.write({threadId}, '/project', {visible: false})).toEqual({
    ok: true,
    value: {expanded: ['src'], visible: false},
  })
  expect(store.write({threadId}, '/project', {expanded: []})).toEqual({
    ok: true,
    value: {expanded: [], visible: false},
  })
  expect(createThreadTreeState(home).read({threadId}, '/project')).toEqual({
    ok: true,
    value: {expanded: [], visible: false},
  })
})

it('should preserve independent changes from concurrent viewer servers', async () => {
  const workerPath = join(home, 'writer.mjs')
  await build({
    bundle: true,
    entryPoints: [new URL('./fixtures/tree-state-writer.mjs', import.meta.url).pathname],
    format: 'esm',
    outfile: workerPath,
    platform: 'node',
  })
  const store = createThreadTreeState(home)
  store.write({threadId}, '/project', {expanded: ['src'], visible: true})
  const control = new Int32Array(new SharedArrayBuffer(4))
  const worker = new Worker(workerPath, {
    execArgv: [],
    workerData: {control: control.buffer, home, metadata: {threadId}},
  })
  try {
    await once(worker, 'message')
    store.write({threadId}, '/project', {expanded: []})
    const finished = once(worker, 'exit')
    Atomics.store(control, 0, 1)
    Atomics.notify(control, 0)
    await finished
    expect(store.read({threadId}, '/project')).toEqual({
      ok: true,
      value: {expanded: [], visible: false},
    })
  } finally {
    await worker.terminate()
  }
})
