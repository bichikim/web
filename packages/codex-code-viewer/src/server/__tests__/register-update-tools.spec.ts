/** @vitest-environment node */
import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js'
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {readPluginRelease} from '../read-plugin-release'
import {registerUpdateTools} from '../register-update-tools'
import {runPluginUpdate} from '../run-plugin-update'
import {version} from '../../../package.json'

vi.mock('../read-plugin-release', () => ({readPluginRelease: vi.fn()}))
vi.mock('../run-plugin-update', () => ({runPluginUpdate: vi.fn()}))
describe('registerUpdateTools', () => {
  let server: McpServer
  let client: Client
  beforeEach(async () => {
    vi.mocked(runPluginUpdate).mockResolvedValue(undefined)
    vi.mocked(readPluginRelease).mockResolvedValue('99.0.0')
    server = new McpServer({name: 'updates-test', version: '1.0.0'})
    registerUpdateTools(server, 'claude')
    client = new Client({name: 'test', version: '1.0.0'})
    const [backend, frontend] = InMemoryTransport.createLinkedPair()
    await server.connect(backend)
    await client.connect(frontend)
  })
  afterEach(async () => {
    await client.close()
    await server.close()
    vi.clearAllMocks()
  })
  it('should advertise app-only tools and distinguish the read-only check from installation', async () => {
    const {tools} = await client.listTools()
    expect(tools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          _meta: {ui: {visibility: ['app']}},
          annotations: expect.objectContaining({readOnlyHint: true}),
          name: 'code.update-check',
        }),
        expect.objectContaining({
          _meta: {ui: {visibility: ['app']}},
          annotations: expect.objectContaining({readOnlyHint: false}),
          name: 'code.update-install',
        }),
      ]),
    )
  })
  it('should check and install through the actual MCP transport', async () => {
    expect(
      (await client.callTool({arguments: {}, name: 'code.update-check'})).structuredContent,
    ).toEqual({current: version, latest: '99.0.0', status: 'available', target: 'claude'})
    expect(
      (await client.callTool({arguments: {version: '99.0.0'}, name: 'code.update-install'}))
        .structuredContent,
    ).toMatchObject({status: 'installed'})
    expect(runPluginUpdate).toHaveBeenCalledWith('99.0.0', 'claude')
  })
  it('should report check failure without exposing external errors', async () => {
    vi.mocked(readPluginRelease).mockRejectedValueOnce(new Error('offline'))
    expect(await client.callTool({arguments: {}, name: 'code.update-check'})).toMatchObject({
      isError: true,
      structuredContent: {code: 'update-check-failed'},
    })
  })
  it('should reject unchecked installation without running a process', async () => {
    expect(
      await client.callTool({arguments: {version: '99.0.0'}, name: 'code.update-install'}),
    ).toMatchObject({isError: true, structuredContent: {code: 'update-install-failed'}})
    expect(runPluginUpdate).not.toHaveBeenCalled()
  })
  it('should distinguish a busy profile from an unsuccessful installation', async () => {
    await client.callTool({arguments: {}, name: 'code.update-check'})
    vi.mocked(runPluginUpdate).mockRejectedValueOnce(
      Object.assign(new Error('busy'), {code: 'update-in-progress'}),
    )
    expect(
      await client.callTool({arguments: {version: '99.0.0'}, name: 'code.update-install'}),
    ).toMatchObject({
      isError: true,
      structuredContent: {code: 'update-in-progress'},
    })
  })
})
