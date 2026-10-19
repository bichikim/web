import {setImmediate} from 'node:timers/promises'
import {EventEmitter} from 'node:events'
import {spawn} from 'node:child_process'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createNativeClient} from '../create-native-client'

const native = vi.hoisted(() => ({
  child: {
    exitCode: 0,
    kill: vi.fn(),
    signalCode: null,
    stderr: {on: vi.fn()},
    stdin: {},
    stdout: {},
  },
  connection: {
    dispose: vi.fn(),
    listen: vi.fn(),
    onNotification: vi.fn(),
    onRequest: vi.fn(),
    sendNotification: vi.fn(async (_method: string, _params: unknown) => undefined),
    sendRequest: vi.fn(
      async (_method: string, _params: unknown, _token?: unknown): Promise<unknown> => [],
    ),
  },
  preparation: {diagnostics: vi.fn(), dispose: vi.fn(), prepare: vi.fn(async () => false)},
  readFile: vi.fn(),
}))
vi.mock('../create-native-preparation', () => ({createNativePreparation: () => native.preparation}))
vi.mock('node:child_process', () => {
  const module = {spawn: vi.fn(() => native.child)}
  return {...module, default: module}
})
vi.mock('node:fs', () => {
  const module = {readFileSync: native.readFile}
  return {...module, default: module}
})
vi.mock('vscode-jsonrpc/node.js', async () => ({
  ...(await vi.importActual<typeof import('vscode-jsonrpc/node.js')>('vscode-jsonrpc/node.js')),
  createMessageConnection: () => native.connection,
  StreamMessageReader: class {},
  StreamMessageWriter: class {},
}))

const source = 'const value = 1'
const query = {file: 'src/use.ts', kind: 'definition', offset: 6, source} as const
let client: ReturnType<typeof createNativeClient>
beforeEach(() => {
  vi.clearAllMocks()
  native.preparation.prepare.mockResolvedValue(false)
  native.connection.sendRequest.mockResolvedValue([])
  native.readFile.mockReturnValue(source)
  const child = Object.assign(new EventEmitter(), native.child)
  vi.mocked(spawn).mockReturnValue(child as unknown as ReturnType<typeof spawn>)
  client = createNativeClient({
    binary: '/native/tsc',
    documents: [],
    receive: vi.fn(),
    root: '/workspace',
  })
  child.emit('spawn')
})
afterEach(async () => client?.dispose())

describe('createNativeClient', () => {
  it('should configure navigation without background diagnostics or auto-import warming', async () => {
    await client.query(query)
    expect(native.connection.sendRequest).toHaveBeenCalledWith(
      'initialize',
      expect.objectContaining({
        initializationOptions: {
          disablePushDiagnostics: true,
          userPreferences: {suggest: {autoImports: false}},
        },
      }),
    )
  })

  it('should prepare saved project members without creating editor overlays', async () => {
    native.preparation.prepare.mockResolvedValue(true)
    await client.prepare(['src/one.ts', 'src/two.ts'])
    expect(native.preparation.prepare).toHaveBeenCalledWith(
      ['/workspace/src/one.ts', '/workspace/src/two.ts'],
      undefined,
      undefined,
    )
    expect(native.connection.sendNotification.mock.calls.map(([method]) => method)).not.toContain(
      'textDocument/didOpen',
    )
  })

  it('should retain document preparation when batch preparation is unavailable', async () => {
    await client.prepare(['src/one.ts'])
    expect(native.connection.sendNotification).toHaveBeenCalledWith(
      'textDocument/didOpen',
      expect.objectContaining({textDocument: expect.objectContaining({text: source})}),
    )
  })
  it('should notify dispatch after fallback document notifications finish', async () => {
    const written = Promise.withResolvers<void>()
    const transfer = Promise.withResolvers<void>()
    native.connection.sendNotification.mockImplementation(async (method) => {
      if (method === 'textDocument/didOpen') {
        written.resolve()
        await transfer.promise
      }
    })
    const dispatched = vi.fn()
    const complete = client.prepare(['src/one.ts'], undefined, {dispatched})
    await written.promise
    expect(dispatched).not.toHaveBeenCalled()
    transfer.resolve()
    await complete
    expect(dispatched).toHaveBeenCalledTimes(1)
  })
  it('should restore previously retained project members if a later API preparation fails', async () => {
    native.preparation.prepare.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    await client.prepare(['src/retained.ts'])
    await client.prepare(['src/next.ts'])
    expect(
      native.connection.sendNotification.mock.calls
        .filter(([method]) => method === 'textDocument/didOpen')
        .map(([, params]) => (params as {textDocument: {uri: string}}).textDocument.uri),
    ).toEqual(['file:///workspace/src/retained.ts', 'file:///workspace/src/next.ts'])
  })
  it('should synchronize drafts and restore an existing overlay before preparing saved members', async () => {
    const draft = 'const draft = 2'
    await client.prepare(['src/edit.ts'], new Map([['/workspace/src/edit.ts', draft]]))
    expect(native.preparation.prepare).not.toHaveBeenCalled()
    native.preparation.prepare.mockResolvedValue(true)
    await client.prepare(['src/edit.ts', 'src/saved.ts'])
    expect(native.connection.sendNotification).toHaveBeenCalledWith(
      'textDocument/didChange',
      expect.objectContaining({contentChanges: [{text: source}]}),
    )
    expect(native.preparation.prepare).toHaveBeenCalledWith(
      ['/workspace/src/saved.ts'],
      undefined,
      undefined,
    )
  })

  it('should query an unchanged disk document without opening another editor overlay', async () => {
    const receive = vi.fn()
    native.connection.sendRequest.mockResolvedValue([
      {
        range: {end: {character: 8, line: 2}, start: {character: 3, line: 2}},
        uri: 'file:///workspace/lib/value.d.ts',
      },
    ])
    const locations = await client.query({
      ...query,
      document: 'disk',
      includeDeclaration: true,
      kind: 'references',
      receive,
    })
    expect(native.readFile).toHaveBeenCalledWith('/workspace/src/use.ts', 'utf8')
    expect(native.connection.sendNotification.mock.calls.map(([method]) => method)).not.toContain(
      'textDocument/didOpen',
    )
    expect(locations).toEqual([{column: 4, line: 3, path: 'lib/value.d.ts'}])
    expect(receive).toHaveBeenCalledWith(locations)
    expect(native.connection.sendRequest).toHaveBeenCalledWith(
      'textDocument/references',
      expect.objectContaining({context: {includeDeclaration: true}}),
      expect.anything(),
    )
  })

  it('should reject changed disk text before requesting symbol locations', async () => {
    native.readFile.mockReturnValue('const other = 2')
    await expect(client.query({...query, document: 'disk'})).rejects.toThrow('stale-source')
    expect(native.connection.sendRequest.mock.calls.map(([method]) => method)).toEqual([
      'initialize',
    ])
  })

  it('should synchronize an existing edited overlay before querying its disk version', async () => {
    await client.query({...query, source: 'const draft = 1'})
    await client.query({...query, document: 'disk'})
    expect(native.connection.sendNotification).toHaveBeenCalledWith('textDocument/didChange', {
      contentChanges: [{text: source}],
      textDocument: {uri: 'file:///workspace/src/use.ts', version: 2},
    })
  })

  it('should retain an overlay when compiler decoding removes a UTF-8 BOM', async () => {
    native.readFile.mockReturnValue(`\uFEFF${source}`)
    await client.query({...query, document: 'disk'})
    expect(native.connection.sendNotification).toHaveBeenCalledWith('textDocument/didOpen', {
      textDocument: {
        languageId: 'typescript',
        text: source,
        uri: 'file:///workspace/src/use.ts',
        version: 1,
      },
    })
  })
  it('should publish no late results after the request is cancelled', async () => {
    const pending = Promise.withResolvers<unknown>()
    const started = Promise.withResolvers<void>()
    const receive = vi.fn()
    native.connection.sendRequest.mockImplementation(async (method) => {
      if (method === 'textDocument/definition') {
        started.resolve()
        return pending.promise
      }
      return []
    })
    const controller = new AbortController()
    const request = client.query({...query, receive, signal: controller.signal})
    await started.promise
    controller.abort()
    const rejected = expect(request).rejects.toThrow()
    pending.resolve([])
    await rejected
    expect(receive).not.toHaveBeenCalled()
  })
  it('should wait for streamed results to be consumed before completing a request', async () => {
    const consumed = Promise.withResolvers<void>()
    const started = Promise.withResolvers<void>()
    let completed = false
    const request = client
      .query({
        ...query,
        receive: async () => {
          started.resolve()
          await consumed.promise
        },
      })
      .then(() => {
        completed = true
      })
    try {
      await started.promise
      await setImmediate()
      expect(completed).toBe(false)
    } finally {
      consumed.resolve()
      await request
    }
  })
  it('should propagate a failed result consumer to its lookup', async () => {
    const error = new Error('consumer failed')
    const rejected = Promise.reject(error)
    rejected.catch(() => undefined)
    await expect(client.query({...query, receive: () => rejected})).rejects.toBe(error)
  })
  it('should drain partial result consumption even when the final response is empty', async () => {
    const handler: unknown = native.connection.onNotification.mock.calls.find(
      ([method]) => method === '$/progress',
    )?.[1]
    if (typeof handler !== 'function') {
      throw new Error('Missing progress receiver')
    }
    const response = Promise.withResolvers<unknown>()
    const consumed = Promise.withResolvers<void>()
    const started = Promise.withResolvers<void>()
    native.connection.sendRequest.mockImplementation(async (method, params) => {
      if (method === 'initialize') {
        return []
      }
      if (typeof params !== 'object' || params === null || !('partialResultToken' in params)) {
        throw new Error('Missing result token')
      }
      handler({
        token: params.partialResultToken,
        value: [
          {
            range: {end: {character: 11, line: 0}, start: {character: 6, line: 0}},
            uri: 'file:///workspace/consumer.ts',
          },
        ],
      })
      return response.promise
    })
    let completed = false
    const request = client
      .query({
        ...query,
        receive: async (locations) => {
          if (locations.length > 0) {
            started.resolve()
            await consumed.promise
          }
        },
      })
      .then(() => {
        completed = true
      })
    try {
      await started.promise
      response.resolve([])
      await setImmediate()
      expect(completed).toBe(false)
    } finally {
      consumed.resolve()
      await request
    }
  })
})
