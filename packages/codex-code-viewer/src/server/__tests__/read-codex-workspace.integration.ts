import {mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {DatabaseSync} from 'node:sqlite'
import {afterEach, beforeEach, expect, it} from 'vitest'
import {readCodexWorkspace} from '../read-codex-workspace'

const threadId = '01a119e7-be97-7020-930b-7049fb95be38'
let home: string
let project: string
let settings: string
const saveSelection = (root: string): void => {
  writeFileSync(
    settings,
    JSON.stringify({
      'active-workspace-roots': ['/stale'],
      'local-projects': {selected: {rootPaths: [root]}},
      'selected-project': {projectId: 'selected', type: 'local'},
    }),
  )
}
beforeEach(() => {
  home = realpathSync(mkdtempSync(join(tmpdir(), 'viewer-codex-workspace-')))
  project = join(home, 'project')
  settings = join(home, '.codex-global-state.json')
  mkdirSync(project)
  saveSelection(project)
})
afterEach(() => rmSync(home, {force: true, recursive: true}))

it('should use the selected project before a chat exists, ignoring legacy active roots', () => {
  expect(readCodexWorkspace({home, metadata: undefined})).toEqual({ok: true, value: project})
})

it('should switch from the project default to the invoking thread worktree as soon as it exists', () => {
  const worktree = join(home, 'worktree')
  mkdirSync(worktree)
  const database = new DatabaseSync(join(home, 'state_5.sqlite'))
  try {
    database.exec('CREATE TABLE threads (id TEXT PRIMARY KEY, cwd TEXT)')
    expect(readCodexWorkspace({home, metadata: {threadId}})).toEqual({ok: true, value: project})
    database.prepare('INSERT INTO threads VALUES (?, ?)').run(threadId, worktree)
    expect(readCodexWorkspace({home, metadata: {threadId}})).toEqual({ok: true, value: worktree})
    writeFileSync(settings, '{')
    expect(readCodexWorkspace({home, metadata: {threadId}})).toEqual({ok: true, value: worktree})
  } finally {
    database.close()
  }
})

it('should read the current selection again instead of caching the initial project', () => {
  expect(readCodexWorkspace({home, metadata: undefined})).toEqual({ok: true, value: project})
  const next = join(home, 'next')
  mkdirSync(next)
  saveSelection(next)
  expect(readCodexWorkspace({home, metadata: undefined})).toEqual({ok: true, value: next})
})

it.each([
  {},
  {'selected-project': null},
  {'selected-project': {projectId: 'selected', type: 'remote'}},
  {'local-projects': {}, 'selected-project': {projectId: 'missing', type: 'local'}},
  {
    'local-projects': {selected: {rootPaths: []}},
    'selected-project': {projectId: 'selected', type: 'local'},
  },
  {
    'local-projects': {selected: {rootPaths: ['relative']}},
    'selected-project': {projectId: 'selected', type: 'local'},
  },
  {'active-workspace-roots': ['/stale']},
])('should leave the panel unconnected for an absent or unusable selection %j', (value) => {
  writeFileSync(settings, JSON.stringify(value))
  expect(readCodexWorkspace({home, metadata: undefined})).toEqual({ok: true, value: undefined})
})

it.each(['{', 'null', '[]'])('should ignore malformed optional settings %s', (value) => {
  writeFileSync(settings, value)
  expect(readCodexWorkspace({home, metadata: undefined})).toEqual({ok: true, value: undefined})
})

it('should ignore deleted project folders and file paths', () => {
  saveSelection(join(home, 'missing'))
  expect(readCodexWorkspace({home, metadata: undefined})).toEqual({ok: true, value: undefined})
  saveSelection(settings)
  expect(readCodexWorkspace({home, metadata: undefined})).toEqual({ok: true, value: undefined})
})

it('should leave a missing settings file unconnected', () => {
  rmSync(settings)
  expect(readCodexWorkspace({home, metadata: undefined})).toEqual({ok: true, value: undefined})
})

it('should preserve database read failures instead of opening an unrelated default', () => {
  writeFileSync(join(home, 'state_5.sqlite'), 'corrupt')
  expect(readCodexWorkspace({home, metadata: {threadId}})).toEqual({
    error: {code: 'read-failed'},
    ok: false,
  })
})

it('should report unreadable settings', () => {
  rmSync(settings)
  mkdirSync(settings)
  expect(readCodexWorkspace({home, metadata: undefined})).toEqual({
    error: {code: 'read-failed'},
    ok: false,
  })
})
