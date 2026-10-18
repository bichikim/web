import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {DatabaseSync} from 'node:sqlite'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {readThreadWorkspace} from '../read-thread-workspace'

describe('readThreadWorkspace', () => {
  const threadId = '01a119e7-be97-7020-930b-7049fb95be38'
  let home: string
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'viewer-thread-'))
    const database = new DatabaseSync(join(home, 'state_5.sqlite'))
    database.exec('CREATE TABLE threads (id TEXT PRIMARY KEY, cwd TEXT)')
    database.prepare('INSERT INTO threads VALUES (?, ?)').run(threadId, '/project')
    database.close()
  })
  afterEach(() => rmSync(home, {force: true, recursive: true}))
  it('should return only the invoking thread cwd without needing a transcript column or file', () => {
    expect(readThreadWorkspace({home, metadata: {threadId}})).toEqual({ok: true, value: '/project'})
  })
  it.each([
    undefined,
    {},
    {threadId: '../other'},
    {threadId: '01a11020-8962-72f1-8735-2a87c41aba83'},
  ])('should leave an absent or invalid thread unconnected for %j', (metadata) => {
    expect(readThreadWorkspace({home, metadata})).toEqual({ok: true, value: undefined})
  })
  it('should leave a missing Codex home unconnected without creating it', () => {
    expect(readThreadWorkspace({home: join(home, 'missing'), metadata: {threadId}})).toEqual({
      ok: true,
      value: undefined,
    })
  })
  it('should leave an empty Codex home unconnected', () => {
    const empty = join(home, 'empty')
    mkdirSync(empty)
    expect(readThreadWorkspace({home: empty, metadata: {threadId}})).toEqual({
      ok: true,
      value: undefined,
    })
  })
  it('should select the newest database and reject a relative cwd', () => {
    const database = new DatabaseSync(join(home, 'state_10.sqlite'))
    database.exec('CREATE TABLE threads (id TEXT PRIMARY KEY, cwd TEXT)')
    database.prepare('INSERT INTO threads VALUES (?, ?)').run(threadId, 'relative')
    database.close()
    expect(readThreadWorkspace({home, metadata: {threadId}})).toEqual({ok: true, value: undefined})
  })
  it('should report an unreadable database instead of guessing a working directory', () => {
    writeFileSync(join(home, 'state_6.sqlite'), 'corrupt')
    expect(readThreadWorkspace({home, metadata: {threadId}})).toEqual({
      error: {code: 'read-failed'},
      ok: false,
    })
  })
})
