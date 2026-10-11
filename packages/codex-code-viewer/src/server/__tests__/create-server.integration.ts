import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {z} from 'zod'
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
  it('should share the viewer build address across entry points and preserve saved file connections', async () => {
    const listing = await client.listTools()
    const metadata = z.object({ui: z.object({resourceUri: z.string()})})
    const uri = metadata.parse(listing.tools.find((tool) => tool.name === 'code.panel')?._meta).ui
      .resourceUri
    expect(uri).toMatch(/^ui:\/\/codex-code-viewer\/app-[a-f0-9]{64}\.html$/u)
    for (const name of ['code.open', 'code.file']) {
      expect(
        metadata.parse(listing.tools.find((tool) => tool.name === name)?._meta).ui.resourceUri,
      ).toBe(uri)
    }
    const resource = await client.readResource({uri})
    expect(resource.contents[0]).toMatchObject({text: '<html>viewer</html>', uri})
    expect(
      (await client.readResource({uri: 'ui://codex-code-viewer/app.html'})).contents[0],
    ).toMatchObject({text: '<html>viewer</html>'})
  })
  it.each([
    {html: '<html>viewer</html>', unchanged: true},
    {html: '<html>viewer with settings</html>', unchanged: false},
  ])(
    'should reuse a resource address only for unchanged viewer content ($unchanged)',
    async ({html, unchanged}) => {
      const metadata = z.object({ui: z.object({resourceUri: z.string()})})
      const original = metadata.parse(
        (await client.listTools()).tools.find((tool) => tool.name === 'code.panel')?._meta,
      ).ui.resourceUri
      await client.close()
      await instance.dispose()
      instance = createServer(html)
      client = new Client({name: 'viewer-test', version: '1.0.0'})
      const [server, transport] = InMemoryTransport.createLinkedPair()
      await instance.server.connect(server)
      await client.connect(transport)
      const next = metadata.parse(
        (await client.listTools()).tools.find((tool) => tool.name === 'code.panel')?._meta,
      ).ui.resourceUri
      expect(next === original).toBe(unchanged)
      expect((await client.readResource({uri: next})).contents[0]).toMatchObject({text: html})
      expect((await client.readResource({uri: original})).contents[0]).toMatchObject({text: html})
    },
  )
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
  it('should expose declaration usages and preserve definition navigation', async () => {
    const root = mkdtempSync(join(tmpdir(), 'viewer-reference-tool-'))
    try {
      mkdirSync(join(root, '.git'))
      const source = 'export const greet = () => 1\n'
      writeFileSync(join(root, 'helper.ts'), source)
      writeFileSync(join(root, 'main.ts'), "import {greet} from './helper'\ngreet()\n")
      const opened = sessionSchema.parse(
        (await client.callTool({arguments: {path: join(root, 'helper.ts')}, name: 'code.open'}))
          .structuredContent,
      )
      const input = {
        navigation: 'definition',
        offset: source.indexOf('greet') + 2,
        path: 'helper.ts',
        revision: opened.document.revision,
        session: opened.session,
      }
      expect(await client.callTool({arguments: input, name: 'code.navigate'})).toMatchObject({
        structuredContent: {
          kind: 'references',
          locations: expect.arrayContaining([
            {column: 1, line: 2, path: 'main.ts', preview: 'greet()'},
          ]),
        },
      })
      const main = sessionSchema.parse(
        (await client.callTool({arguments: {path: join(root, 'main.ts')}, name: 'code.open'}))
          .structuredContent,
      )
      const next = {path: 'main.ts', revision: main.document.revision, session: main.session}
      expect(
        await client.callTool({
          arguments: {
            ...next,
            navigation: 'definition',
            offset: main.document.source.lastIndexOf('greet'),
          },
          name: 'code.navigate',
        }),
      ).toMatchObject({
        structuredContent: {
          kind: 'definition',
          locations: [{column: 14, line: 1, path: 'helper.ts'}],
        },
      })
      expect(
        await client.callTool({
          arguments: {
            ...next,
            navigation: 'path',
            offset: main.document.source.indexOf('./helper'),
          },
          name: 'code.navigate',
        }),
      ).toMatchObject({
        structuredContent: {
          kind: 'definition',
          locations: [{column: 1, line: 1, path: 'helper.ts'}],
        },
      })
      await client.callTool({arguments: {session: opened.session}, name: 'code.close'})
      await client.callTool({arguments: {session: main.session}, name: 'code.close'})
    } finally {
      rmSync(root, {force: true, recursive: true})
    }
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
})
