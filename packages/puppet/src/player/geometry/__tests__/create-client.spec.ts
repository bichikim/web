import {MessageChannel} from 'node:worker_threads'
import {expect, test} from 'vitest'
import {createGeometryClient} from '../create-client'
import type {GeometryRequest} from '../types'
test('should transfer packets while retaining borrowed source geometry', async () => {
  const channel = new MessageChannel()
  const client = createGeometryClient({
    connection: 1,
    owner: 'device',
    port: channel.port2 as unknown as MessagePort,
  })
  try {
    const initialization = new Promise<GeometryRequest>((resolve) => {
      channel.port1.once('message', resolve)
    })
    const layout = new Float64Array([1, 0, 0])
    const ready = client.initialize(layout)
    const request = await initialization
    expect(layout.byteLength).toBe(0)
    channel.port1.postMessage({id: request.id, kind: 'initialized'})
    await ready
    const received = new Promise<GeometryRequest>((resolve) => {
      channel.port1.once('message', resolve)
    })
    const source = new Float32Array([1, 2])
    const commands = new Uint32Array([0, 1, 0, 1])
    const values = new Float32Array([3])
    const plan = new Float64Array([4])
    const finished = client.prepare({commands, frame: 7, plan, values, vertices: source})
    const message = await received
    expect(Array.from(source)).toEqual([1, 2])
    expect(commands.byteLength).toBe(0)
    expect(values.byteLength).toBe(0)
    expect(plan.byteLength).toBe(0)
    const vertices = new Float32Array([5, 6])
    channel.port1.postMessage({id: message.id, kind: 'prepared', vertices}, [vertices.buffer])
    const response = await finished
    if (response.kind !== 'prepared') {
      throw new Error('Expected completion')
    }
    expect(Array.from(response.vertices)).toEqual([5, 6])
  } finally {
    client.free()
    channel.port1.close()
    channel.port2.close()
  }
})
test('should reject pending requests after its connection is disposed', async () => {
  const channel = new MessageChannel()
  const client = createGeometryClient({
    connection: 1,
    owner: 'device',
    port: channel.port2 as unknown as MessagePort,
  })
  const pending = expect(client.initialize(new Float64Array())).rejects.toThrow('closed')
  client.free()
  await pending
  await expect(client.initialize(new Float64Array())).rejects.toThrow('closed')
  channel.port1.close()
  channel.port2.close()
})
