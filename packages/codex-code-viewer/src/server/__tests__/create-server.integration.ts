import {readFileSync} from 'node:fs'
import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {sessionSchema, treeSchema} from '../../shared/contracts'
import {createServer} from '../create-server'

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
  it('should advertise JavaScript and TypeScript file replacement and deliver the viewer resource', async () => {
    const listing = await client.listTools()
    const viewer = listing.tools.find((tool) => tool.name === 'code.file')
    expect(viewer?._meta).toMatchObject({
      'openai/ui': {
        entrypoints: [
          {
            extensions: expect.arrayContaining(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts']),
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
