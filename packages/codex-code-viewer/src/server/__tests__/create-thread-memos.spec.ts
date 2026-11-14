/** @vitest-environment node */
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createThreadMemos} from '../create-thread-memos'

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
  return {...actual, readFileSync: vi.fn(actual.readFileSync), renameSync: vi.fn(actual.renameSync)}
})

const threadId = '01a119e7-be97-7020-930b-7049fb95be38'
const other = '01a11020-8962-72f1-8735-2a87c41aba83'
let home: string
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'viewer-memos-'))
})
afterEach(() => {
  vi.clearAllMocks()
  rmSync(home, {force: true, recursive: true})
})

it('should restore only the same chat across storage instances independently of workspace metadata', () => {
  const memos = createThreadMemos(home)
  expect(memos.write({threadId}, {items: ['메모'], visible: true})).toMatchObject({ok: true})
  expect(memos.write({threadId}, {expanded: false})).toMatchObject({ok: true})
  const reopened = createThreadMemos(home)
  expect(reopened.read({threadId, workspace: '/another'})).toEqual({
    ok: true,
    value: {expanded: false, items: ['메모'], visible: true},
  })
  expect(reopened.read({threadId: other})).toEqual({
    ok: true,
    value: {expanded: true, items: [], visible: false},
  })
})

it('should reject missing or invalid chat identity without sharing a fallback store', () => {
  const memos = createThreadMemos(home)
  expect(memos.read(undefined)).toEqual({error: {code: 'thread-unavailable'}, ok: false})
  expect(memos.write({threadId: '../other'}, {items: ['메모']})).toEqual({
    error: {code: 'thread-unavailable'},
    ok: false,
  })
})

it('should report corrupted saved memos without replacing them with an empty list', () => {
  const directory = join(home, 'code-viewer', 'memos')
  mkdirSync(directory, {recursive: true})
  writeFileSync(join(directory, `${threadId}.json`), '{broken')
  const memos = createThreadMemos(home)
  expect(memos.read({threadId})).toEqual({error: {code: 'read-failed'}, ok: false})
  expect(memos.write({threadId}, {visible: true})).toEqual({
    error: {code: 'read-failed'},
    ok: false,
  })
})

it('should report storage write failures', () => {
  const memos = createThreadMemos(home)
  memos.write({threadId}, {items: ['보존할 메모']})
  vi.mocked(renameSync).mockImplementationOnce(() => {
    throw new Error('disk unavailable')
  })
  expect(memos.write({threadId}, {items: ['메모']})).toEqual({
    error: {code: 'memo-write-failed'},
    ok: false,
  })
  expect(memos.read({threadId})).toMatchObject({ok: true, value: {items: ['보존할 메모']}})
  expect(
    readdirSync(join(home, 'code-viewer', 'memos')).some((name) => name.endsWith('.tmp')),
  ).toBe(false)
})

it('should restore legacy snapshots and update individual fields without rewriting the legacy file', () => {
  const directory = join(home, 'code-viewer', 'memos')
  mkdirSync(directory, {recursive: true})
  const path = join(directory, `${threadId}.json`)
  const legacy = JSON.stringify({expanded: false, items: ['기존 메모'], visible: true})
  writeFileSync(path, legacy)
  const memos = createThreadMemos(home)
  expect(memos.read({threadId})).toMatchObject({
    ok: true,
    value: {expanded: false, items: ['기존 메모'], visible: true},
  })
  expect(memos.write({threadId}, {items: ['수정한 메모']})).toMatchObject({ok: true})
  expect(createThreadMemos(home).read({threadId})).toMatchObject({
    ok: true,
    value: {expanded: false, items: ['수정한 메모'], visible: true},
  })
  expect(readFileSync(path, 'utf8')).toBe(legacy)
})

it('should preserve a concurrent item save when another instance saves visibility', () => {
  const first = createThreadMemos(home)
  const second = createThreadMemos(home)
  const directory = join(home, 'code-viewer', 'memos')
  mkdirSync(directory, {recursive: true})
  const snapshot = JSON.stringify({expanded: true, items: ['기존 메모'], visible: false})
  writeFileSync(join(directory, `${threadId}.json`), snapshot)
  vi.mocked(readFileSync).mockImplementationOnce(() => {
    expect(second.write({threadId}, {items: ['다른 뷰어의 새 메모']})).toMatchObject({ok: true})
    return snapshot
  })
  expect(first.write({threadId}, {visible: true})).toMatchObject({ok: true})
  expect(second.read({threadId})).toMatchObject({
    ok: true,
    value: {items: ['다른 뷰어의 새 메모'], visible: true},
  })
})
