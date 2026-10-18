import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {entrySchema, entrySnapshotSchema, sessionSchema, treeSchema} from '../../shared/contracts'
import {createServer} from '../create-server'

describe('createServer file operations', () => {
  let client: Client
  let instance: ReturnType<typeof createServer>
  beforeEach(async () => {
    instance = createServer('<html>viewer</html>')
    client = new Client({name: 'viewer-test', version: '1.0.0'})
    const [server, transport] = InMemoryTransport.createLinkedPair()
    await instance.server.connect(server)
    await client.connect(transport)
  })
  afterEach(async () => {
    await client.close()
    await instance.dispose()
  })
  it('should create session-scoped entries, list empty folders and reject collisions or expired sessions', async () => {
    const root = mkdtempSync(join(tmpdir(), 'viewer-create-tool-'))
    try {
      mkdirSync(join(root, '.git'))
      writeFileSync(join(root, 'main.ts'), '')
      const opened = sessionSchema.parse(
        (await client.callTool({arguments: {path: join(root, 'main.ts')}, name: 'code.open'}))
          .structuredContent,
      )
      const input = {kind: 'directory', name: 'new', parent: '', session: opened.session}
      const result = await client.callTool({arguments: input, name: 'code.create'})
      expect(entrySchema.parse(result.structuredContent)).toEqual({kind: 'directory', path: 'new'})
      expect(
        treeSchema.parse(
          (await client.callTool({arguments: {session: opened.session}, name: 'code.tree'}))
            .structuredContent,
        ).directories,
      ).toEqual(['new'])
      expect(
        await client.callTool({
          arguments: {...input, kind: 'file', name: 'hello.ts', parent: 'new'},
          name: 'code.create',
        }),
      ).toMatchObject({structuredContent: {kind: 'file', path: 'new/hello.ts'}})
      expect(readFileSync(join(root, 'new/hello.ts'), 'utf8')).toBe('')
      expect(await client.callTool({arguments: input, name: 'code.create'})).toMatchObject({
        isError: true,
        structuredContent: {code: 'already-exists'},
      })
      expect(
        (await client.listTools()).tools.find((tool) => tool.name === 'code.create')?.annotations,
      ).toMatchObject({destructiveHint: false, openWorldHint: false, readOnlyHint: false})
      await client.callTool({arguments: {session: opened.session}, name: 'code.close'})
      expect(await client.callTool({arguments: input, name: 'code.create'})).toMatchObject({
        isError: true,
        structuredContent: {code: 'session-expired'},
      })
    } finally {
      rmSync(root, {force: true, recursive: true})
    }
  })
  it('should expose app-only file operations and enforce revisions and session lifetime', async () => {
    const root = mkdtempSync(join(tmpdir(), 'viewer-operations-tool-'))
    try {
      mkdirSync(join(root, '.git'))
      mkdirSync(join(root, 'dest'))
      writeFileSync(join(root, 'main.ts'), 'original')
      const opened = sessionSchema.parse(
        (await client.callTool({arguments: {path: join(root, 'main.ts')}, name: 'code.open'}))
          .structuredContent,
      )
      const input = {path: 'main.ts', session: opened.session}
      const snapshot = entrySnapshotSchema.parse(
        (await client.callTool({arguments: input, name: 'code.entry'})).structuredContent,
      )
      expect(Object.keys(snapshot).sort()).toEqual(['kind', 'path', 'revision'])
      const transfer = {action: 'cut', parent: 'dest', ...input, revision: snapshot.revision}
      expect(
        await client.callTool({arguments: {...transfer, parent: '..'}, name: 'code.transfer'}),
      ).toMatchObject({isError: true, structuredContent: {code: 'outside-workspace'}})
      expect(await client.callTool({arguments: transfer, name: 'code.transfer'})).toMatchObject({
        structuredContent: {kind: 'file', path: 'dest/main.ts'},
      })
      expect(existsSync(join(root, 'main.ts'))).toBe(false)
      expect(readFileSync(join(root, 'dest/main.ts'), 'utf8')).toBe('original')
      const rename = {...input, path: 'dest/main.ts'}
      const beforeRename = entrySnapshotSchema.parse(
        (await client.callTool({arguments: rename, name: 'code.entry'})).structuredContent,
      )
      expect(
        await client.callTool({
          arguments: {...rename, name: 'helper.ts', revision: 'stale'},
          name: 'code.rename',
        }),
      ).toMatchObject({isError: true, structuredContent: {code: 'entry-changed'}})
      expect(
        await client.callTool({
          arguments: {...rename, name: 'helper.ts', revision: beforeRename.revision},
          name: 'code.rename',
        }),
      ).toMatchObject({structuredContent: {kind: 'file', path: 'dest/helper.ts'}})
      expect(readFileSync(join(root, 'dest/helper.ts'), 'utf8')).toBe('original')
      const moved = {...input, path: 'dest/helper.ts'}
      const inspected = entrySnapshotSchema.parse(
        (await client.callTool({arguments: moved, name: 'code.entry'})).structuredContent,
      )
      expect(
        await client.callTool({arguments: {...moved, revision: 'stale'}, name: 'code.remove'}),
      ).toMatchObject({isError: true, structuredContent: {code: 'entry-changed'}})
      expect(
        await client.callTool({
          arguments: {...moved, revision: inspected.revision},
          name: 'code.remove',
        }),
      ).toMatchObject({structuredContent: {kind: 'file', path: 'dest/helper.ts'}})
      expect(existsSync(join(root, 'dest/helper.ts'))).toBe(false)
      const listing = (await client.listTools()).tools
      for (const name of ['code.entry', 'code.transfer', 'code.remove', 'code.rename']) {
        expect(listing.find((tool) => tool.name === name)?._meta).toMatchObject({
          ui: {visibility: ['app']},
        })
      }
      await client.callTool({arguments: {session: opened.session}, name: 'code.close'})
      expect(await client.callTool({arguments: transfer, name: 'code.transfer'})).toMatchObject({
        isError: true,
        structuredContent: {code: 'session-expired'},
      })
    } finally {
      rmSync(root, {force: true, recursive: true})
    }
  })
  it('should expose revision-checked writes only to the app and report conflicts', async () => {
    const tools = await client.listTools()
    expect(tools.tools.find((tool) => tool.name === 'code.write')).toMatchObject({
      _meta: {ui: {visibility: ['app']}},
      annotations: {destructiveHint: true, openWorldHint: false, readOnlyHint: false},
    })
    const root = mkdtempSync(join(tmpdir(), 'viewer-save-tool-'))
    try {
      mkdirSync(join(root, '.git'))
      const path = join(root, 'main.ts')
      writeFileSync(path, 'export const value = 1\n')
      const opened = sessionSchema.parse(
        (await client.callTool({arguments: {path}, name: 'code.open'})).structuredContent,
      )
      const input = {
        path: 'main.ts',
        revision: opened.document.revision,
        session: opened.session,
        source: 'export const value = 2\n',
      }
      expect(await client.callTool({arguments: input, name: 'code.write'})).toMatchObject({
        structuredContent: {document: {source: input.source}},
      })
      expect(readFileSync(path, 'utf8')).toBe(input.source)
      expect(
        await client.callTool({
          arguments: {...input, source: 'export const value = 3\n'},
          name: 'code.write',
        }),
      ).toMatchObject({isError: true, structuredContent: {code: 'write-conflict'}})
      expect(readFileSync(path, 'utf8')).toBe(input.source)
      rmSync(path)
      expect(
        await client.callTool({arguments: {...input, revision: null}, name: 'code.write'}),
      ).toMatchObject({
        structuredContent: {document: {source: input.source}},
      })
      expect(readFileSync(path, 'utf8')).toBe(input.source)
      expect(
        await client.callTool({arguments: {...input, revision: null}, name: 'code.write'}),
      ).toMatchObject({
        isError: true,
        structuredContent: {code: 'write-conflict'},
      })
      await client.callTool({arguments: {session: opened.session}, name: 'code.close'})
      expect(await client.callTool({arguments: input, name: 'code.write'})).toMatchObject({
        isError: true,
        structuredContent: {code: 'session-expired'},
      })
    } finally {
      rmSync(root, {force: true, recursive: true})
    }
  })
})
