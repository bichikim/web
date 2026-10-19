import {EventEmitter} from 'node:events'
import {createConnection, type Socket} from 'node:net'
import {
  createMessageConnection,
  type MessageConnection,
  type MessageWriter,
  SocketMessageWriter,
} from 'vscode-jsonrpc/node.js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createNativePreparation} from '../create-native-preparation'

vi.mock('node:net', () => {
  const module = {createConnection: vi.fn()}
  return {...module, default: module}
})
vi.mock('vscode-jsonrpc/node.js', async () => ({
  ...(await vi.importActual<typeof import('vscode-jsonrpc/node.js')>('vscode-jsonrpc/node.js')),
  createMessageConnection: vi.fn(),
  SocketMessageReader: vi.fn(),
  SocketMessageWriter: vi.fn(),
}))

const api = {
  dispose: vi.fn(),
  listen: vi.fn(),
  sendRequest: vi.fn(
    async (method: string, _params: unknown, _token?: unknown): Promise<unknown> =>
      method === 'updateSnapshot' ? {snapshot: 2} : true,
  ),
}
const control = {sendRequest: vi.fn(async (): Promise<unknown> => ({pipe: '/tmp/native-api.sock'}))}
let socket: Socket
let created: ReturnType<typeof Promise.withResolvers<void>>
let preparation: ReturnType<typeof createNativePreparation>
const connected = async <Value>(operation: Promise<Value>): Promise<Value> => {
  await created.promise
  socket.emit('connect')
  return operation
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(SocketMessageWriter).mockReset()
  created = Promise.withResolvers<void>()
  socket = Object.assign(new EventEmitter(), {destroy: vi.fn()}) as unknown as Socket
  vi.mocked(createConnection).mockImplementation(() => {
    created.resolve()
    return socket
  })
  vi.mocked(createMessageConnection).mockReturnValue(api as unknown as MessageConnection)
  control.sendRequest.mockResolvedValue({pipe: '/tmp/native-api.sock'})
  api.sendRequest.mockImplementation(async (method) =>
    method === 'updateSnapshot' ? {snapshot: 2} : true,
  )
  preparation = createNativePreparation(control)
})
afterEach(() => preparation.dispose())
describe('createNativePreparation', () => {
  it('should retain all project members with one snapshot and release its temporary handle', async () => {
    const paths = ['/workspace/one.ts', '/workspace/outside/use.mjs']
    expect(await connected(preparation.prepare(paths))).toBe(true)
    expect(control.sendRequest).toHaveBeenCalledWith(
      'custom/initializeAPISession',
      {},
      expect.anything(),
    )
    expect(api.sendRequest).toHaveBeenCalledWith(
      'updateSnapshot',
      {openFiles: paths},
      expect.anything(),
    )
    expect(api.sendRequest).toHaveBeenCalledWith('release', {snapshot: 2}, expect.anything())
    expect(preparation.diagnostics()).toEqual({batches: 1, fallback: false, files: 2})
  })
  it('should notify dispatch after the write and before the snapshot response', async () => {
    const written = Promise.withResolvers<void>()
    const transfer = Promise.withResolvers<void>()
    const snapshot = Promise.withResolvers<unknown>()
    const dispatched = Promise.withResolvers<void>()
    const notify = vi.fn(() => dispatched.resolve())
    vi.mocked(SocketMessageWriter).mockImplementation(function createWriter() {
      return {
        write: async () => {
          written.resolve()
          await transfer.promise
        },
      } as unknown as SocketMessageWriter
    })
    api.sendRequest.mockImplementation(async (method, params) => {
      if (method === 'updateSnapshot') {
        const writer = vi.mocked(createMessageConnection).mock
          .calls[0]![1] as unknown as MessageWriter
        const message = {id: 1, jsonrpc: '2.0', method, params}
        await writer.write(message)
        return snapshot.promise
      }
      return true
    })
    const complete = connected(preparation.prepare(['/workspace/one.ts'], undefined, notify))
    await written.promise
    expect(notify).not.toHaveBeenCalled()
    transfer.resolve()
    await dispatched.promise
    expect(preparation.diagnostics().batches).toBe(0)
    snapshot.resolve({snapshot: 2})
    expect(await complete).toBe(true)
    expect(notify).toHaveBeenCalledTimes(1)
  })
  it('should share its connection and retain unique files across preparations', async () => {
    await connected(preparation.prepare(['/workspace/one.ts']))
    await preparation.prepare(['/workspace/one.ts', '/workspace/two.ts'])
    expect(control.sendRequest).toHaveBeenCalledTimes(1)
    expect(createConnection).toHaveBeenCalledTimes(1)
    expect(preparation.diagnostics()).toEqual({batches: 2, fallback: false, files: 2})
  })
  it('should defer unsupported API preparation to the document path without repeated probes', async () => {
    control.sendRequest.mockRejectedValue(new Error('Method not found'))
    expect(await preparation.prepare(['/workspace/one.ts'])).toBe(false)
    expect(await preparation.prepare(['/workspace/two.ts'])).toBe(false)
    expect(control.sendRequest).toHaveBeenCalledTimes(1)
    expect(createConnection).not.toHaveBeenCalled()
  })
  it('should close a failed snapshot connection before returning to document preparation', async () => {
    api.sendRequest.mockImplementation(async (method) => {
      if (method === 'updateSnapshot') {
        throw new Error('snapshot unavailable')
      }
      return true
    })
    expect(await connected(preparation.prepare(['/workspace/one.ts']))).toBe(false)
    expect(api.dispose).toHaveBeenCalledTimes(1)
    expect(socket.destroy).toHaveBeenCalledTimes(1)
    expect(preparation.diagnostics()).toEqual({batches: 0, fallback: true, files: 0})
  })
  it('should return to document preparation when the socket cannot connect', async () => {
    const operation = preparation.prepare(['/workspace/one.ts'])
    await created.promise
    socket.emit('error', new Error('connection unavailable'))
    expect(await operation).toBe(false)
    expect(socket.destroy).toHaveBeenCalledTimes(1)
  })
  it('should close the API session if its temporary snapshot cannot be released', async () => {
    api.sendRequest.mockImplementation(async (method) => {
      if (method === 'release') {
        throw new Error('release failed')
      }
      return {snapshot: 2}
    })
    expect(await connected(preparation.prepare(['/workspace/one.ts']))).toBe(false)
    expect(socket.destroy).toHaveBeenCalledTimes(1)
    expect(preparation.diagnostics()).toEqual({batches: 0, fallback: true, files: 0})
  })
  it('should reject a malformed snapshot response as unavailable preparation', async () => {
    api.sendRequest.mockResolvedValue({snapshot: 'invalid'})
    expect(await connected(preparation.prepare(['/workspace/one.ts']))).toBe(false)
    expect(api.sendRequest.mock.calls.map(([method]) => method)).not.toContain('release')
    expect(preparation.diagnostics().fallback).toBe(true)
  })
  it('should interrupt the wait for a pending snapshot without claiming preparation completed', async () => {
    const snapshot = Promise.withResolvers<unknown>()
    const started = Promise.withResolvers<void>()
    api.sendRequest.mockImplementation(async (method) => {
      if (method === 'updateSnapshot') {
        started.resolve()
        return snapshot.promise
      }
      return true
    })
    const controller = new AbortController()
    const operation = connected(preparation.prepare(['/workspace/one.ts'], controller.signal))
    await started.promise
    controller.abort()
    await expect(operation).rejects.toThrow()
    expect(preparation.diagnostics()).toEqual({batches: 0, fallback: false, files: 0})
    snapshot.resolve({snapshot: 2})
  })
  it('should stop connecting when disposed before the API endpoint responds', async () => {
    const endpoint = Promise.withResolvers<unknown>()
    control.sendRequest.mockReturnValue(endpoint.promise)
    const operation = preparation.prepare(['/workspace/one.ts'])
    preparation.dispose()
    await expect(operation).rejects.toThrow()
    endpoint.resolve({pipe: '/tmp/native-api.sock'})
    expect(createConnection).not.toHaveBeenCalled()
  })
  it('should leave an empty preparation free of API connections', async () => {
    expect(await preparation.prepare([])).toBe(true)
    expect(control.sendRequest).not.toHaveBeenCalled()
  })
})
