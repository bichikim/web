import {MessageChannel} from 'node:worker_threads'
import {afterEach, expect, test, vi} from 'vitest'
import {createGeometryConnections} from '../create-geometry-connections'
afterEach(() => vi.unstubAllGlobals())
test('should distinguish caller release from loss of the rendering owner', async () => {
  vi.stubGlobal('MessageChannel', MessageChannel)
  const disconnect = vi.fn()
  const connections = createGeometryConnections({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect,
    owner: 'device',
  })
  const released = await connections.connect()
  const lost = await connections.connect()
  const unexpected = vi.fn()
  released.closed.then(unexpected)
  released.release()
  released.release()
  connections.destroy()
  await lost.closed
  expect(disconnect).toHaveBeenCalledOnce()
  expect(disconnect).toHaveBeenCalledWith(released.connection)
  expect(unexpected).not.toHaveBeenCalled()
  await expect(connections.connect()).rejects.toThrow('closed')
})
test('should reject a connection whose owner closes before acquisition finishes', async () => {
  vi.stubGlobal('MessageChannel', MessageChannel)
  let complete = () => {}
  const opened = new Promise<void>((resolve) => {
    complete = resolve
  })
  const connections = createGeometryConnections({
    connect: () => opened,
    disconnect: vi.fn(),
    owner: 'device',
  })
  const pending = expect(connections.connect()).rejects.toThrow('closed')
  connections.destroy()
  complete()
  await pending
})
