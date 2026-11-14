import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {
  createKnowledgeServer,
  type CreateKnowledgeServerOptions,
  type KnowledgeRelatedIdentityRequest,
} from '../server'
import type {KnowledgeIdentity} from '../../indexing/read'

const scope = {repoId: 'test/repo', workspaceId: 'refs/heads/main'}
const response = {...scope, command: 'get' as const, logicalId: 'a#one', points: []}
const close: Array<() => Promise<void>> = []
afterEach(async () => {
  await Promise.all(close.splice(0).map((cleanup) => cleanup()))
})
const connect = async (structured = true) => {
  const dependencies = {
    get: vi.fn<CreateKnowledgeServerOptions['get']>(async () => ({ok: true, value: response})),
    getByIdentity: vi.fn(async (selector: KnowledgeIdentity) => ({
      ok: true as const,
      value: {...scope, command: 'get' as const, points: [], selector},
    })),
    related: vi.fn<CreateKnowledgeServerOptions['related']>(async () => ({
      ok: true,
      value: {...scope, logicalId: 'a#one', missing: [], points: [], truncated: false},
    })),
    relatedByIdentity: vi.fn(async (input: KnowledgeRelatedIdentityRequest) => ({
      ok: true as const,
      value: {
        ...scope,
        missing: [],
        points: [],
        selector: {
          docId: input.docId,
          ...(input.unitId === undefined ? {} : {unitId: input.unitId}),
        },
        truncated: false,
      },
    })),
    search: vi.fn<CreateKnowledgeServerOptions['search']>(async ({query}) => ({
      ok: true,
      value: {...scope, command: 'search' as const, hits: [], query},
    })),
  }
  const server = createKnowledgeServer(
    structured
      ? dependencies
      : {
          get: dependencies.get,
          related: dependencies.related,
          search: dependencies.search,
        },
  )
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
  it('should retain legacy server integrations when structured capabilities are omitted', async () => {
    const {client, dependencies} = await connect(false)
    const legacy = await client.callTool({arguments: {logicalId: 'a#one'}, name: 'knowledge_get'})
    expect(legacy.structuredContent).toEqual(response)
    const structured = await client.callTool({
      arguments: {docId: 'docs/C#.md'},
      name: 'knowledge_get',
    })
    expect(structured).toMatchObject({
      content: [{text: '{"error":{"code":"structured-lookup-unavailable"}}'}],
      isError: true,
    })
    expect(dependencies.getByIdentity).not.toHaveBeenCalled()
  })
  it.each([{docId: 'docs/C#.md'}, {docId: "docs/It's %23#.md", unitId: 'overview'}])(
    'should accept a structured lookup without synthesizing a logical ID %j',
    async (selector) => {
      const {client, dependencies} = await connect()
      const get = await client.callTool({arguments: selector, name: 'knowledge_get'})
      expect(get.isError).not.toBe(true)
      expect(get.structuredContent).toMatchObject({points: [], selector})
      expect(get.structuredContent).not.toHaveProperty('logicalId')
      const related = await client.callTool({
        arguments: {...selector, limit: 2},
        name: 'knowledge_related',
      })
      expect(related.isError).not.toBe(true)
      expect(related.structuredContent).toMatchObject({missing: [], selector, truncated: false})
      expect(related.structuredContent).not.toHaveProperty('logicalId')
      expect(dependencies.get).not.toHaveBeenCalled()
      expect(dependencies.related).not.toHaveBeenCalled()
      expect(dependencies.getByIdentity).toHaveBeenCalledWith(selector)
      expect(dependencies.relatedByIdentity).toHaveBeenCalledWith({...selector, limit: 2})
    },
  )
  it.each([
    {},
    {unitId: 'overview'},
    {docId: ' '},
    {docId: 'doc', unitId: ''},
    {docId: 'doc', logicalId: 'legacy'},
    {logicalId: 'legacy', unitId: 'unit'},
    {docId: 'doc', repo: '/other'},
    {docId: 'x'.repeat(4097)},
    {docId: 'x'.repeat(3000), unitId: 'x'.repeat(2000)},
  ])(
    'should reject invalid or mixed lookup input %j before invoking either capability',
    async (input) => {
      const {client, dependencies} = await connect()
      const results = await Promise.all(
        ['knowledge_get', 'knowledge_related'].map((name) =>
          client.callTool({arguments: input, name}),
        ),
      )
      expect(results).toEqual([
        expect.objectContaining({isError: true}),
        expect.objectContaining({isError: true}),
      ])
      expect(dependencies.get).not.toHaveBeenCalled()
      expect(dependencies.related).not.toHaveBeenCalled()
      expect(dependencies.getByIdentity).not.toHaveBeenCalled()
      expect(dependencies.relatedByIdentity).not.toHaveBeenCalled()
    },
  )
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
