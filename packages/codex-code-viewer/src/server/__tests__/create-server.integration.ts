import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {sessionSchema, success, treeSchema, workspaceSessionSchema} from '../../shared/contracts'
import {createServer} from '../create-server'
import {version} from '../../../package.json'

describe('createServer', () => {
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
  it('should advertise the released package version to the MCP client', () => {
    expect(client.getServerVersion()?.version).toBe(version)
  })
  it('should advertise JavaScript and TypeScript file replacement and deliver the viewer resource', async () => {
    const listing = await client.listTools()
    const viewer = listing.tools.find((tool) => tool.name === 'code.file')
    expect(viewer?._meta).toMatchObject({
      'openai/ui': {
        entrypoints: [
          {
            extensions: expect.arrayContaining([
              '.ts',
              '.tsx',
              '.js',
              '.jsx',
              '.mjs',
              '.mts',
              '.md',
              '.mdx',
              '.txt',
              '.html',
              '.dockerignore',
              '.gitignore',
              '.png',
              '.mp4',
              '.mp3',
              '.wav',
              '.m4a',
              '.flac',
              '.rs',
              '.lock',
              '.yaml',
              '.yml',
              '.toml',
              '.jsonc',
              '.json5',
            ]),
            type: 'file',
          },
        ],
      },
    })
    expect(
      (await client.readResource({uri: 'ui://codex-code-viewer/app.html'})).contents[0],
    ).toMatchObject({mimeType: 'text/html;profile=mcp-app', text: '<html>viewer</html>'})
  })
  it('should attach with host metadata and reject missing metadata', async () => {
    expect(await client.callTool({arguments: {}, name: 'code.attach'})).toMatchObject({
      isError: true,
      structuredContent: {code: 'host-path-missing'},
    })
    const result = await client.callTool({
      _meta: {'openai/resource': {path}},
      arguments: {},
      name: 'code.attach',
    })
    const session = sessionSchema.parse(result.structuredContent)
    expect(session.document.source).toBe(readFileSync(path, 'utf8'))
    await client.callTool({arguments: {session: session.session}, name: 'code.close'})
    expect(
      await client.callTool({
        arguments: {path: session.document.location.path, session: session.session},
        name: 'code.read',
      }),
    ).toMatchObject({isError: true, structuredContent: {code: 'session-expired'}})
  })
  it('should open an empty thread panel and allow the app to open its first file', async () => {
    const listing = await client.listTools()
    expect(listing.tools.find((tool) => tool.name === 'code.panel')?._meta).toMatchObject({
      'openai/ui': {entrypoints: [{type: 'thread'}]},
    })
    expect(listing.tools.find((tool) => tool.name === 'code.open')?._meta).toMatchObject({
      ui: {visibility: ['app', 'model']},
    })
    expect(await client.callTool({arguments: {}, name: 'code.panel'})).toMatchObject({
      structuredContent: {panel: true},
    })
    const result = await client.callTool({arguments: {path}, name: 'code.open'})
    expect(sessionSchema.parse(result.structuredContent).document.source).toBe(
      readFileSync(path, 'utf8'),
    )
  })
  it('should connect the thread workspace without choosing a file and allow reading from its tree', async () => {
    await client.close()
    await instance.dispose()
    const root = new URL('../', import.meta.url).pathname.replace(/\/$/u, '')
    instance = createServer('<html>viewer</html>', {workspace: () => success(root)})
    client = new Client({name: 'viewer-test', version: '1.0.0'})
    const [server, transport] = InMemoryTransport.createLinkedPair()
    await instance.server.connect(server)
    await client.connect(transport)
    const result = await client.callTool({arguments: {}, name: 'code.panel'})
    const session = workspaceSessionSchema.parse(result.structuredContent)
    expect(session.workspace).toBe(root)
    expect(result.structuredContent).not.toHaveProperty('document')
    const tree = await client.callTool({arguments: {session: session.session}, name: 'code.tree'})
    expect(treeSchema.parse(tree.structuredContent).files).toContainEqual({
      openable: true,
      path: 'tokenize-source.ts',
    })
    const read = await client.callTool({
      arguments: {path: 'tokenize-source.ts', session: session.session},
      name: 'code.read',
    })
    expect(read.structuredContent).toMatchObject({document: {source: readFileSync(path, 'utf8')}})
    expect(
      await client.callTool({
        arguments: {path: '../package.json', session: session.session},
        name: 'code.read',
      }),
    ).toMatchObject({isError: true, structuredContent: {code: 'outside-workspace'}})
  })
  it('should reject offsets from a stale document', async () => {
    const result = await client.callTool({arguments: {path}, name: 'code.open'})
    const session = sessionSchema.parse(result.structuredContent)
    expect(
      await client.callTool({
        arguments: {
          navigation: 'definition',
          offset: 0,
          path: session.document.location.path,
          revision: 'old',
          session: session.session,
        },
        name: 'code.navigate',
      }),
    ).toMatchObject({isError: true, structuredContent: {code: 'stale-document'}})
  })

  it('should list files through the app-only tree tool for an active workspace', async () => {
    const listing = await client.listTools()
    expect(listing.tools.find((tool) => tool.name === 'code.tree')).toMatchObject({
      _meta: {ui: {visibility: ['app']}},
      annotations: {readOnlyHint: true},
    })
    const result = await client.callTool({arguments: {path}, name: 'code.open'})
    const session = sessionSchema.parse(result.structuredContent)
    const tree = await client.callTool({arguments: {session: session.session}, name: 'code.tree'})
    expect(tree.isError).not.toBe(true)
    expect(treeSchema.parse(tree.structuredContent).files).toContainEqual({
      openable: true,
      path: session.document.location.path,
    })
    await client.callTool({arguments: {session: session.session}, name: 'code.close'})
    expect(
      await client.callTool({arguments: {session: session.session}, name: 'code.tree'}),
    ).toMatchObject({isError: true, structuredContent: {code: 'session-expired'}})
  })

  it('should identify an absent absolute file as not found', async () => {
    expect(
      await client.callTool({arguments: {path: `${path}.missing.ts`}, name: 'code.open'}),
    ).toMatchObject({isError: true, structuredContent: {code: 'not-found'}})
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
