import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js'
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js'
import {SubscribeRequestSchema, UnsubscribeRequestSchema} from '@modelcontextprotocol/sdk/types.js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {createResourceSubscriptions} from '../create-resource-subscriptions'

describe('createResourceSubscriptions', () => {
  afterEach(() => vi.restoreAllMocks())

  it('should receive standard MCP updates over a real connection without OpenAI capabilities', async () => {
    const server = new McpServer({name: 'resource-test', version: '1'})
    const client = new Client({name: 'resource-test', version: '1'})
    server.server.registerCapabilities({resources: {subscribe: true}})
    const subscriptions = new Set<string>()
    server.server.setRequestHandler(SubscribeRequestSchema, async ({params}) => {
      subscriptions.add(params.uri)
      return {}
    })
    server.server.setRequestHandler(UnsubscribeRequestSchema, async ({params}) => {
      subscriptions.delete(params.uri)
      return {}
    })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await server.connect(serverTransport)
    await client.connect(clientTransport)
    try {
      const resources = createResourceSubscriptions(client)
      const received = Promise.withResolvers<string>()
      const remove = resources.addUpdateHandler(({params}) => received.resolve(params.uri))
      const uri = 'file:///tmp/workspace/revision.json'
      await resources.subscribe({uri})
      expect(subscriptions.has(uri)).toBe(true)
      await server.server.sendResourceUpdated({uri})
      expect(await received.promise).toBe(uri)
      remove()
      await resources.unsubscribe({uri})
      expect(subscriptions.size).toBe(0)
    } finally {
      await client.close()
      await server.close()
    }
  })

  it('should deliver updates to active listeners and remove only the released listener', async () => {
    const client = new Client({name: 'resource-test', version: '1'})
    const listener = vi.spyOn(client, 'setNotificationHandler')
    const resources = createResourceSubscriptions(client)
    const first = vi.fn()
    const second = vi.fn()
    const remove = resources.addUpdateHandler(first)
    resources.addUpdateHandler(second)
    const notification = {
      method: 'notifications/resources/updated' as const,
      params: {uri: 'file:///tmp/workspace/revision.json'},
    }
    const handler = listener.mock.calls[0][1]
    await handler(notification)
    expect(first).toHaveBeenCalledWith(notification)
    expect(second).toHaveBeenCalledWith(notification)
    remove()
    await handler(notification)
    expect(first).toHaveBeenCalledOnce()
    expect(second).toHaveBeenCalledTimes(2)
  })

  it('should preserve subscription request failures for the caller', async () => {
    const client = new Client({name: 'resource-test', version: '1'})
    const error = new Error('subscription unavailable')
    const request = vi.spyOn(client, 'request').mockRejectedValue(error)
    const resources = createResourceSubscriptions(client)
    const params = {uri: 'file:///tmp/workspace/revision.json'}
    await expect(resources.subscribe(params)).rejects.toBe(error)
    expect(request).toHaveBeenCalledWith({method: 'resources/subscribe', params}, expect.anything())
    await expect(resources.unsubscribe(params)).rejects.toBe(error)
    expect(request).toHaveBeenLastCalledWith(
      {method: 'resources/unsubscribe', params},
      expect.anything(),
    )
  })
})
