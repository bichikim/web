import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {z} from 'zod'
import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {scanBatchSchema, sessionSchema} from '../../shared/contracts'
import {createServer} from '../create-server'

describe('createServer streaming', () => {
  let client: Client
  let instance: ReturnType<typeof createServer>
  const path = new URL('../tokenize-source.ts', import.meta.url).pathname
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
  it('should deliver real workspace changes through the local event stream and reject closed sessions', async () => {
    const root = mkdtempSync(join(tmpdir(), 'viewer-live-tool-'))
    try {
      mkdirSync(join(root, '.git'))
      writeFileSync(join(root, 'main.ts'), 'before')
      const opened = sessionSchema.parse(
        (
          await client.callTool({
            arguments: {path: join(root, 'main.ts')},
            name: 'code.open',
          })
        ).structuredContent,
      )
      const watched = await client.callTool({
        arguments: {session: opened.session},
        name: 'code.watch',
      })
      const {url} = z.object({url: z.string()}).parse(watched.structuredContent)
      expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\//u)
      expect((await fetch(`${url}-unknown`)).status).toBe(404)
      const response = await fetch(url)
      expect(response.headers.get('content-type')).toBe('text/event-stream')
      const reader = response.body?.getReader()
      if (reader === undefined) {
        throw new Error('Missing event stream')
      }
      expect(new TextDecoder().decode((await reader.read()).value)).toMatch(/^data: \d+\n\n/u)
      writeFileSync(join(root, 'main.ts'), 'after')
      expect(new TextDecoder().decode((await reader.read()).value)).toMatch(/^data: [1-9]\d*\n\n/u)
      expect(
        await client.callTool({
          arguments: {
            path: 'main.ts',
            session: opened.session,
          },
          name: 'code.read',
        }),
      ).toMatchObject({structuredContent: {document: {source: 'after'}}})
      await reader.cancel()
      const subscribed = (await fetch(url)).body?.getReader()
      await subscribed?.read()
      await client.callTool({arguments: {session: opened.session}, name: 'code.close'})
      expect((await subscribed?.read())?.done).toBe(true)
      expect((await fetch(url)).status).toBe(404)
      expect(
        await client.callTool({arguments: {session: opened.session}, name: 'code.watch'}),
      ).toMatchObject({
        isError: true,
        structuredContent: {code: 'session-expired'},
      })
    } finally {
      rmSync(root, {force: true, recursive: true})
    }
  })
  it('should stream file batches over MCP and release them when the viewer session closes', async () => {
    const opened = sessionSchema.parse(
      (await client.callTool({arguments: {path}, name: 'code.open'})).structuredContent,
    )
    const endpoint = await client.callTool({
      arguments: {directories: [''], session: opened.session, stream: true, transport: 'mcp'},
      name: 'code.tree',
    })
    const {url} = z.object({url: z.string()}).parse(endpoint.structuredContent)
    expect(url).toMatch(/^code-viewer:\/\/scan\//u)
    const first = await client.callTool({arguments: {url}, name: 'code.stream.read'})
    expect(first).toMatchObject({structuredContent: {batch: {directory: ''}, done: false}})
    await client.callTool({arguments: {session: opened.session}, name: 'code.close'})
    expect(await client.callTool({arguments: {url}, name: 'code.stream.read'})).toMatchObject({
      isError: true,
    })
  })
  it('should accept completed directory versions through MCP and omit unchanged batches', async () => {
    const root = mkdtempSync(join(tmpdir(), 'viewer-tree-versions-'))
    try {
      mkdirSync(join(root, '.git'))
      writeFileSync(join(root, 'main.ts'), 'export const value = 1')
      const opened = sessionSchema.parse(
        (await client.callTool({arguments: {path: join(root, 'main.ts')}, name: 'code.open'}))
          .structuredContent,
      )
      const endpoint = z.object({url: z.string()})
      const first = endpoint.parse(
        (
          await client.callTool({
            arguments: {directories: [''], session: opened.session, stream: true, transport: 'mcp'},
            name: 'code.tree',
          })
        ).structuredContent,
      )
      const response = z
        .object({batch: scanBatchSchema, done: z.literal(false)})
        .parse(
          (await client.callTool({arguments: {url: first.url}, name: 'code.stream.read'}))
            .structuredContent,
        )
      expect(response.batch.version).toBeTypeOf('string')
      expect(response.batch.files).toContainEqual({openable: true, path: 'main.ts'})
      const next = endpoint.parse(
        (
          await client.callTool({
            arguments: {
              directories: [''],
              session: opened.session,
              stream: true,
              transport: 'mcp',
              versions: {'': response.batch.version},
            },
            name: 'code.tree',
          })
        ).structuredContent,
      )
      expect(
        (await client.callTool({arguments: {url: next.url}, name: 'code.stream.read'}))
          .structuredContent,
      ).toEqual({done: true})
    } finally {
      rmSync(root, {force: true, recursive: true})
    }
  })
  it('should deliver file changes through cancellable MCP waits and reject closed sessions', async () => {
    const root = mkdtempSync(join(tmpdir(), 'viewer-mcp-watch-'))
    try {
      mkdirSync(join(root, '.git'))
      writeFileSync(join(root, 'main.ts'), 'before')
      const opened = sessionSchema.parse(
        (await client.callTool({arguments: {path: join(root, 'main.ts')}, name: 'code.open'}))
          .structuredContent,
      )
      const watched = await client.callTool({
        arguments: {session: opened.session, transport: 'mcp'},
        name: 'code.watch',
      })
      const schema = z.object({revision: z.number().int().nonnegative()})
      const {revision} = schema.parse(watched.structuredContent)
      expect(revision).toBe(0)
      const changed = client.callTool({
        arguments: {revision, session: opened.session},
        name: 'code.watch.next',
      })
      writeFileSync(join(root, 'main.ts'), 'after')
      const next = schema.parse((await changed).structuredContent)
      expect(next.revision).toBeGreaterThan(revision)
      const stale = await client.callTool({
        arguments: {revision, session: opened.session},
        name: 'code.watch.next',
      })
      expect(schema.parse(stale.structuredContent).revision).toBeGreaterThan(revision)
      expect(
        await client.callTool({
          arguments: {path: 'main.ts', session: opened.session},
          name: 'code.read',
        }),
      ).toMatchObject({structuredContent: {document: {source: 'after'}}})
      const controller = new AbortController()
      const latest = schema.parse(
        (
          await client.callTool({
            arguments: {session: opened.session, transport: 'mcp'},
            name: 'code.watch',
          })
        ).structuredContent,
      )
      const cancelled = client.callTool(
        {
          arguments: {revision: latest.revision, session: opened.session},
          name: 'code.watch.next',
        },
        undefined,
        {signal: controller.signal},
      )
      const rejected = expect(cancelled).rejects.toThrow()
      controller.abort()
      await rejected
      const closing = client.callTool({
        arguments: {revision: latest.revision, session: opened.session},
        name: 'code.watch.next',
      })
      await client.callTool({arguments: {session: opened.session}, name: 'code.close'})
      expect(await closing).toMatchObject({isError: true})
      expect(
        await client.callTool({
          arguments: {revision: latest.revision, session: opened.session},
          name: 'code.watch.next',
        }),
      ).toMatchObject({isError: true, structuredContent: {code: 'session-expired'}})
    } finally {
      rmSync(root, {force: true, recursive: true})
    }
  })
})
