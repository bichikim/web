import {mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, expect, it} from 'vitest'
import {createThreadWorkspaces} from '../create-thread-workspaces'

const threadId = '01a119e7-be97-7020-930b-7049fb95be38'
const other = '01a11020-8962-72f1-8735-2a87c41aba83'
let home: string
let workspace: string
beforeEach(() => {
  home = realpathSync(mkdtempSync(join(tmpdir(), 'viewer-workspaces-')))
  workspace = join(home, 'project')
  mkdirSync(workspace)
})
afterEach(() => rmSync(home, {force: true, recursive: true}))
it('should restore a folder for the same thread across store instances', () => {
  const store = createThreadWorkspaces(home)
  expect(store.write({threadId}, workspace)).toEqual({ok: true, value: {}})
  expect(createThreadWorkspaces(home).read({threadId})).toEqual({ok: true, value: workspace})
  expect(store.read({threadId: other})).toEqual({ok: true, value: undefined})
  expect(store.write({threadId}, home)).toEqual({ok: true, value: {}})
  expect(createThreadWorkspaces(home).read({threadId})).toEqual({ok: true, value: home})
})
it.each([undefined, {}, {threadId: '../outside'}])(
  'should refuse persistence without a valid thread identity %j',
  (metadata) => {
    const store = createThreadWorkspaces(home)
    expect(store.write(metadata, workspace)).toMatchObject({ok: false})
    expect(store.read(metadata)).toEqual({ok: true, value: undefined})
  },
)
it('should reject files and missing or relative folders without replacing the saved selection', () => {
  const store = createThreadWorkspaces(home)
  store.write({threadId}, workspace)
  const file = join(home, 'file.txt')
  writeFileSync(file, '')
  for (const path of [file, join(home, 'missing'), 'relative']) {
    expect(store.write({threadId}, path)).toMatchObject({ok: false})
    expect(store.read({threadId})).toEqual({ok: true, value: workspace})
  }
})
it('should report a corrupted saved selection', () => {
  const store = createThreadWorkspaces(home)
  store.write({threadId}, workspace)
  writeFileSync(join(home, 'code-viewer', 'workspaces', `${threadId}.json`), '{')
  expect(store.read({threadId})).toMatchObject({error: {code: 'read-failed'}, ok: false})
})
it('should report persistence failures', () => {
  writeFileSync(join(home, 'code-viewer'), 'file blocks storage directory')
  expect(createThreadWorkspaces(home).write({threadId}, workspace)).toMatchObject({
    error: {code: 'workspace-write-failed'},
    ok: false,
  })
})
