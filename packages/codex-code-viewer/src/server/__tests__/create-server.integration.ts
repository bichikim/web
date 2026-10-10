import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {z} from 'zod'
import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {
  entrySchema,
  entrySnapshotSchema,
  sessionSchema,
  success,
  treeSchema,
  workspaceSessionSchema,
} from '../../shared/contracts'
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
