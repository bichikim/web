import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {createKnowledgeServer, type CreateKnowledgeServerOptions} from '../server'

const scope = {repoId: 'test/repo', workspaceId: 'refs/heads/main'}
const response = {...scope, command: 'get' as const, logicalId: 'a#one', points: []}
const close: Array<() => Promise<void>> = []
afterEach(async () => {
  await Promise.all(close.splice(0).map((cleanup) => cleanup()))
})
const connect = async () => {
  const dependencies = {
    get: vi.fn<CreateKnowledgeServerOptions['get']>(async () => ({ok: true, value: response})),
    related: vi.fn<CreateKnowledgeServerOptions['related']>(async () => ({
      ok: true,
      value: {...scope, logicalId: 'a#one', missing: [], points: [], truncated: false},
    })),
    search: vi.fn<CreateKnowledgeServerOptions['search']>(async ({query}) => ({
      ok: true,
      value: {...scope, command: 'search' as const, hits: [], query},
    })),
  }
  const server = createKnowledgeServer(dependencies)
  const client = new Client({name: 'knowledge-test', version: '1'})
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  close.push(async () => {
    await client.close()
    await server.close()
  })
  await server.connect(serverTransport)
  await client.connect(clientTransport)
  return {client, dependencies}
}

describe('createKnowledgeServer', () => {
  it('should reject oversized results with a bounded error instead of flooding the client', async () => {
    const {client, dependencies} = await connect()
    dependencies.get.mockResolvedValueOnce({
      ok: true,
      value: {...response, repoId: 'x'.repeat(300_000)},
    })
    const result = await client.callTool({arguments: {logicalId: 'a'}, name: 'knowledge_get'})
    expect(result).toMatchObject({
      content: [{text: '{"error":{"code":"response-too-large"}}', type: 'text'}],
      isError: true,
    })
  })
  it('should expose exactly three read-only tools with input and output schemas', async () => {
    const {client} = await connect()
    const {tools} = await client.listTools()
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      'knowledge_get',
      'knowledge_related',
      'knowledge_search',
    ])
    for (const tool of tools) {
      expect(tool.annotations?.readOnlyHint).toBe(true)
      expect(tool.outputSchema).toBeDefined()
      expect(tool.inputSchema.properties).not.toHaveProperty('repo')
    }
  })
  it('should preserve shared get results as structured content and JSON text', async () => {
    const {client, dependencies} = await connect()
    const result = await client.callTool({arguments: {logicalId: 'a#one'}, name: 'knowledge_get'})
    expect(result.structuredContent).toEqual(response)
    expect(result.content).toEqual([{text: JSON.stringify(response), type: 'text'}])
    expect(dependencies.get).toHaveBeenCalledWith('a#one')
  })
  it('should pass search and related limits through the protocol', async () => {
    const {client, dependencies} = await connect()
    await client.callTool({arguments: {limit: 2, query: '토큰'}, name: 'knowledge_search'})
    await client.callTool({arguments: {limit: 3, logicalId: 'a'}, name: 'knowledge_related'})
    expect(dependencies.search).toHaveBeenCalledWith({limit: 2, query: '토큰'})
    expect(dependencies.related).toHaveBeenCalledWith({limit: 3, logicalId: 'a'})
  })
  it('should reject invalid limits and injected repository paths before invoking dependencies', async () => {
    const {client, dependencies} = await connect()
    expect(
      await client.callTool({arguments: {limit: 0, query: 'q'}, name: 'knowledge_search'}),
    ).toMatchObject({isError: true})
    expect(
      await client.callTool({arguments: {logicalId: 'a', repo: '/other'}, name: 'knowledge_get'}),
    ).toMatchObject({isError: true})
    expect(dependencies.get).not.toHaveBeenCalled()
    expect(dependencies.search).not.toHaveBeenCalled()
  })
  it('should expose expected error codes but never raw exceptions', async () => {
    const {client, dependencies} = await connect()
    dependencies.get.mockResolvedValueOnce({error: {code: 'knowledge-not-found'}, ok: false})
    const result = await client.callTool({arguments: {logicalId: 'missing'}, name: 'knowledge_get'})
    expect(result).toMatchObject({
      content: [{text: '{"error":{"code":"knowledge-not-found"}}', type: 'text'}],
      isError: true,
    })
    dependencies.get.mockRejectedValueOnce(new Error('PRIVATE API KEY'))
    const failure = await client.callTool({arguments: {logicalId: 'a'}, name: 'knowledge_get'})
    expect(failure.isError).toBe(true)
    expect(JSON.stringify(failure)).not.toContain('PRIVATE API KEY')
  })
})
