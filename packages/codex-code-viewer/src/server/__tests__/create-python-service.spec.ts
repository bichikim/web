/** @vitest-environment node */
import {EventEmitter} from 'node:events'
import {PassThrough} from 'node:stream'
import {pathToFileURL} from 'node:url'
import {createMessageConnection} from 'vscode-jsonrpc/node.js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createPythonService} from '../create-python-service'
import {readSource} from '../file-access'
import {failure, success} from '../../shared/contracts'

const {spawn} = vi.hoisted(() => ({spawn: vi.fn()}))
vi.mock('node:child_process', () => ({spawn}))
vi.mock('../file-access', () => ({readSource: vi.fn()}))

describe('createPythonService', () => {
  let process: EventEmitter
  let server: ReturnType<typeof createMessageConnection>
  let service: ReturnType<typeof createPythonService>
  let initialize: ReturnType<typeof vi.fn<(value: unknown) => unknown>>
  let definition: ReturnType<typeof vi.fn<(value: unknown) => unknown>>
  let opened: unknown[]
  let changed: unknown[]
  let closed: unknown[]
  let watched: unknown[]
  const root = '/workspace/example'
  const path = `${root}/src/main.py`
  beforeEach(() => {
    const input = new PassThrough()
    const output = new PassThrough()
    process = Object.assign(new EventEmitter(), {
      kill: vi.fn(),
      stderr: new PassThrough(),
      stdin: input,
      stdout: output,
    })
    spawn.mockReturnValue(process)
    server = createMessageConnection(input, output)
    initialize = vi.fn(() => ({capabilities: {definitionProvider: true}}))
    definition = vi.fn(() => [
      {
        range: {end: {character: 13, line: 2}, start: {character: 7, line: 2}},
        uri: pathToFileURL(`${root}/src/math.py`).href,
      },
    ])
    opened = []
    changed = []
    closed = []
    watched = []
    server.onRequest('initialize', (value: unknown) => initialize(value))
    server.onNotification('textDocument/didOpen', (value) => opened.push(value))
    server.onNotification('textDocument/didChange', (value) => changed.push(value))
    server.onNotification('textDocument/didClose', (value) => closed.push(value))
    server.onNotification('workspace/didChangeWatchedFiles', (value) => watched.push(value))
    server.onRequest('textDocument/definition', (value: unknown) => definition(value))
    server.listen()
    service = createPythonService(root)
  })
  afterEach(() => {
    service.dispose()
    server.dispose()
    vi.clearAllMocks()
  })
  it('should initialize once and translate UTF-16 positions and definition links', async () => {
    const source = 'fn main() {\r\n let text = "🦊"; answer();\n}'
    const offset = source.indexOf('answer')
    expect(await service.lookupSymbols(path, source, offset, {kind: 'definition'})).toEqual({
      ok: true,
      value: [{column: 8, line: 3, path: `${root}/src/math.py`}],
    })
    expect(definition).toHaveBeenCalledWith({
      position: {character: 18, line: 1},
      textDocument: {uri: pathToFileURL(path).href},
    })
    definition.mockReturnValue([
      {
        targetRange: {end: {character: 9, line: 0}, start: {character: 0, line: 0}},
        targetSelectionRange: {end: {character: 7, line: 0}, start: {character: 3, line: 0}},
        targetUri: pathToFileURL(path).href,
      },
    ])
    expect(await service.lookupSymbols(path, source, offset, {kind: 'definition'})).toEqual({
      ok: true,
      value: [{column: 4, line: 1, path}],
    })
    expect(initialize).toHaveBeenCalledTimes(1)
    expect(opened).toHaveLength(1)
    expect(changed).toHaveLength(0)
  })
  it('should query indexed aliases without opening files or releasing an active draft', async () => {
    const references = vi.fn((_value: unknown) => [
      {
        range: {end: {character: 7, line: 2}, start: {character: 0, line: 2}},
        uri: pathToFileURL(`${root}/src/closed.py`).href,
      },
    ])
    server.onRequest('textDocument/references', (value: unknown) => references(value))
    await service.lookupSymbols(path, 'def greet(): pass', 4, {draft: true, kind: 'definition'})
    expect(
      await service.lookupIndexedSymbols(
        `${root}/src/closed.py`,
        'from main import greet as welcome',
        26,
        {kind: 'references'},
      ),
    ).toEqual({
      ok: true,
      value: [{column: 1, line: 3, path: `${root}/src/closed.py`}],
    })
    expect(references).toHaveBeenCalledWith({
      context: {includeDeclaration: false},
      position: {character: 26, line: 0},
      textDocument: {uri: pathToFileURL(`${root}/src/closed.py`).href},
    })
    expect(opened).toHaveLength(1)
    expect(closed).toEqual([])
  })
  it('should finish pending requests when the analyzer exits', async () => {
    const requested = Promise.withResolvers<void>()
    definition.mockImplementation(() => {
      requested.resolve()
      return new Promise(() => {})
    })
    const pending = service.lookupSymbols(path, 'main()', 0, {kind: 'definition'})
    await requested.promise
    process.emit('exit', 1)
    expect(await pending).toMatchObject({error: {code: 'python-analysis-failed'}, ok: false})
  })
  it('should publish partial results before completion and merge overlapping final locations', async () => {
    const completed = Promise.withResolvers<unknown>()
    const received = Promise.withResolvers<void>()
    const uri = pathToFileURL(path).href
    const location = {range: {end: {character: 8, line: 2}, start: {character: 3, line: 2}}, uri}
    server.onNotification('textDocument/didOpen', () => {
      server
        .sendNotification('textDocument/publishDiagnostics', {diagnostics: [], uri, version: 1})
        .catch(() => undefined)
    })
    server.onRequest('textDocument/references', async (params) => {
      await server.sendNotification('$/progress', {
        token: params.partialResultToken,
        value: [location],
      })
      return completed.promise
    })
    const receive = vi.fn(() => received.resolve())
    const result = service.lookupSymbols(path, 'greet()', 0, {kind: 'references', receive})
    await received.promise
    expect(receive).toHaveBeenCalledWith([{column: 4, line: 3, path}])
    completed.resolve([location])
    expect(await result).toEqual(success([{column: 4, line: 3, path}]))
    expect(receive).toHaveBeenCalledTimes(1)
  })
  it('should synchronize edited source before requesting a new definition', async () => {
    await service.lookupSymbols(path, 'fn main() {}', 3, {kind: 'definition'})
    await service.lookupSymbols(path, '\nfn main() {}', 4, {kind: 'definition'})
    expect(changed).toEqual([
      {
        contentChanges: [{text: '\nfn main() {}'}],
        textDocument: {uri: pathToFileURL(path).href, version: 2},
      },
    ])
    expect(definition.mock.calls.at(-1)?.[0]).toMatchObject({position: {character: 3, line: 1}})
  })
  it('should synchronize changed closed files and release deleted documents before querying', async () => {
    const helper = `${root}/src/helper.py`
    const uri = pathToFileURL(helper).href
    await service.lookupSymbols(path, 'greet()', 0, {kind: 'definition'})
    vi.mocked(readSource).mockReturnValue(success('def greet(): pass'))
    service.update(root, [{kind: 'created', path: helper}])
    await service.lookupSymbols(path, 'greet()', 0, {kind: 'definition'})
    expect(opened.at(-1)).toMatchObject({textDocument: {text: 'def greet(): pass', uri}})
    vi.mocked(readSource).mockReturnValue(success('\ndef greet(): pass'))
    service.update(root, [{kind: 'changed', path: helper}])
    await service.lookupSymbols(path, 'greet()', 0, {kind: 'definition'})
    expect(changed.at(-1)).toMatchObject({contentChanges: [{text: '\ndef greet(): pass'}]})
    vi.mocked(readSource).mockReturnValue(failure('not-found'))
    service.update(root, [{kind: 'deleted', path: helper}])
    await service.lookupSymbols(path, 'greet()', 0, {kind: 'definition'})
    expect(closed).toEqual([{textDocument: {uri}}])
    expect(watched).toEqual([1, 2, 3].map((type) => ({changes: [{type, uri}]})))
    expect(spawn).toHaveBeenCalledOnce()
  })
  it('should release a previous draft and reindex its saved contents before another file lookup', async () => {
    await service.lookupSymbols(path, '\ngreet()', 1, {draft: true, kind: 'definition'})
    await service.lookupSymbols(`${root}/src/other.py`, 'greet()', 0, {kind: 'definition'})
    const uri = pathToFileURL(path).href
    expect(closed).toEqual([{textDocument: {uri}}])
    expect(watched).toEqual([{changes: [{type: 2, uri}]}])
    expect(spawn).toHaveBeenCalledOnce()
  })
  it('should return no targets for an unresolved symbol', async () => {
    definition.mockReturnValue(null)
    expect(await service.lookupSymbols(path, 'unknown()', 0, {kind: 'definition'})).toEqual({
      ok: true,
      value: [],
    })
  })
  it('should reject malformed or non-file navigation results', async () => {
    definition.mockReturnValue([
      {
        range: {end: {character: 0, line: 0}, start: {character: 0, line: 0}},
        uri: 'https://example.com/file.rs',
      },
    ])
    expect(await service.lookupSymbols(path, 'main()', 0, {kind: 'definition'})).toMatchObject({
      error: {code: 'python-analysis-failed'},
      ok: false,
    })
  })
  it('should report missing analyzer and finish pending initialization', async () => {
    const pending = service.lookupSymbols(path, 'main()', 0, {kind: 'definition'})
    process.emit('error', Object.assign(new Error('missing'), {code: 'ENOENT'}))
    expect(await pending).toMatchObject({error: {code: 'python-analyzer-unavailable'}, ok: false})
  })
  it('should terminate the analyzer when initialization is rejected', async () => {
    initialize.mockRejectedValue(new Error('Initialization failed'))
    expect(await service.lookupSymbols(path, 'greet()', 0, {kind: 'definition'})).toMatchObject({
      error: {code: 'python-analysis-failed'},
      ok: false,
    })
    expect(Reflect.get(process, 'kill')).toHaveBeenCalledOnce()
  })
  it('should release pending requests and stop the process on disposal', async () => {
    const requested = Promise.withResolvers<void>()
    definition.mockImplementation(() => {
      requested.resolve()
      return new Promise(() => {})
    })
    const pending = service.lookupSymbols(path, 'main()', 0, {kind: 'definition'})
    await requested.promise
    service.dispose()
    expect(await pending).toMatchObject({error: {code: 'python-analysis-failed'}, ok: false})
    expect(process).toHaveProperty('kill', expect.any(Function))
    expect(Reflect.get(process, 'kill')).toHaveBeenCalledTimes(1)
  })
  it('should initialize Python definitions and request configuration before navigation', async () => {
    await service.lookupSymbols(path, 'greet()', 0, {kind: 'definition'})
    expect(initialize.mock.calls[0][0]).toMatchObject({
      capabilities: {
        textDocument: {definition: {linkSupport: true}},
        workspace: {configuration: true},
      },
    })
    expect(opened[0]).toMatchObject({textDocument: {languageId: 'python'}})
    expect(
      await server.sendRequest('workspace/configuration', {
        items: [{section: 'python'}, {section: 'pyright'}],
      }),
    ).toEqual([
      {
        analysis: {
          autoSearchPaths: true,
          diagnosticMode: 'openFilesOnly',
          logLevel: 'Error',
          typeCheckingMode: 'off',
          useLibraryCodeForTypes: true,
        },
      },
      {disableOrganizeImports: true},
    ])
  })
  it('should cancel a pending request without restarting its initialized analyzer', async () => {
    const started = Promise.withResolvers<void>()
    server.onRequest('textDocument/definition', (_value, token) => {
      started.resolve()
      return new Promise((resolve) => {
        token.onCancellationRequested(() => resolve([]))
      })
    })
    const controller = new AbortController()
    const pending = service.lookupSymbols(path, 'greet()', 0, {
      kind: 'definition',
      signal: controller.signal,
    })
    await started.promise
    controller.abort()
    await expect(pending).rejects.toThrow()
    server.onRequest('textDocument/definition', (value) => definition(value))
    expect(await service.lookupSymbols(path, 'greet()', 0, {kind: 'definition'})).toMatchObject({
      ok: true,
    })
    expect(spawn).toHaveBeenCalledOnce()
    expect(spawn.mock.results[0].value.kill).not.toHaveBeenCalled()
  })
  it('should preserve initialization after a caller cancels its wait', async () => {
    const initialized = Promise.withResolvers<unknown>()
    initialize.mockReturnValue(initialized.promise)
    const controller = new AbortController()
    const pending = service.lookupSymbols(path, 'greet()', 0, {
      kind: 'definition',
      signal: controller.signal,
    })
    controller.abort()
    await expect(pending).rejects.toThrow()
    initialized.resolve({capabilities: {definitionProvider: true}})
    expect(await service.lookupSymbols(path, 'greet()', 0, {kind: 'definition'})).toMatchObject({
      ok: true,
    })
    expect(spawn).toHaveBeenCalledOnce()
  })
  it('should cancel a queued lookup before the active request finishes', async () => {
    const started = Promise.withResolvers<void>()
    const response = Promise.withResolvers<unknown>()
    definition.mockImplementationOnce(() => {
      started.resolve()
      return response.promise
    })
    const active = service.lookupSymbols(path, 'greet()', 0, {kind: 'definition'})
    await started.promise
    const controller = new AbortController()
    let cancelled = false
    const queued = service
      .lookupSymbols(path, 'greet()', 0, {
        kind: 'definition',
        signal: controller.signal,
      })
      .catch((error: unknown) => {
        cancelled = error === controller.signal.reason
      })
    controller.abort()
    await new Promise<void>((resolve) => {
      setImmediate(resolve)
    })
    try {
      expect(cancelled).toBe(true)
      expect(definition).toHaveBeenCalledOnce()
    } finally {
      response.resolve([])
      await active
      await queued
    }
    expect(await service.lookupSymbols(path, 'greet()', 0, {kind: 'definition'})).toMatchObject({
      ok: true,
    })
    expect(definition).toHaveBeenCalledTimes(2)
    expect(spawn).toHaveBeenCalledOnce()
  })
})
