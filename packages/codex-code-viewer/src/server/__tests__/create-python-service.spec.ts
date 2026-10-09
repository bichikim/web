/** @vitest-environment node */
import {EventEmitter} from 'node:events'
import {PassThrough} from 'node:stream'
import {pathToFileURL} from 'node:url'
import {createMessageConnection} from 'vscode-jsonrpc/node.js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createPythonService} from '../create-python-service'

const {spawn} = vi.hoisted(() => ({spawn: vi.fn()}))
vi.mock('node:child_process', () => ({spawn}))

describe('createPythonService', () => {
  let process: EventEmitter
  let server: ReturnType<typeof createMessageConnection>
  let service: ReturnType<typeof createPythonService>
  let initialize: ReturnType<typeof vi.fn<(value: unknown) => unknown>>
  let definition: ReturnType<typeof vi.fn<(value: unknown) => unknown>>
  let opened: unknown[]
  let changed: unknown[]
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
    server.onRequest('initialize', (value: unknown) => initialize(value))
    server.onNotification('textDocument/didOpen', (value) => opened.push(value))
    server.onNotification('textDocument/didChange', (value) => changed.push(value))
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
    expect(await service.lookupSymbols(path, source, offset, 'definition')).toEqual({
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
    expect(await service.lookupSymbols(path, source, offset, 'definition')).toEqual({
      ok: true,
      value: [{column: 4, line: 1, path}],
    })
    expect(initialize).toHaveBeenCalledTimes(1)
    expect(opened).toHaveLength(1)
    expect(changed).toHaveLength(0)
  })
  it('should finish pending requests when the analyzer exits', async () => {
    const requested = Promise.withResolvers<void>()
    definition.mockImplementation(() => {
      requested.resolve()
      return new Promise(() => {})
    })
    const pending = service.lookupSymbols(path, 'main()', 0, 'definition')
    await requested.promise
    process.emit('exit', 1)
    expect(await pending).toMatchObject({error: {code: 'python-analysis-failed'}, ok: false})
  })
  it('should synchronize edited source before requesting a new definition', async () => {
    await service.lookupSymbols(path, 'fn main() {}', 3, 'definition')
    await service.lookupSymbols(path, '\nfn main() {}', 4, 'definition')
    expect(changed).toEqual([
      {
        contentChanges: [{text: '\nfn main() {}'}],
        textDocument: {uri: pathToFileURL(path).href, version: 2},
      },
    ])
    expect(definition.mock.calls.at(-1)?.[0]).toMatchObject({position: {character: 3, line: 1}})
  })
  it('should return no targets for an unresolved symbol', async () => {
    definition.mockReturnValue(null)
    expect(await service.lookupSymbols(path, 'unknown()', 0, 'definition')).toEqual({
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
    expect(await service.lookupSymbols(path, 'main()', 0, 'definition')).toMatchObject({
      error: {code: 'python-analysis-failed'},
      ok: false,
    })
  })
  it('should report missing analyzer and finish pending initialization', async () => {
    const pending = service.lookupSymbols(path, 'main()', 0, 'definition')
    process.emit('error', Object.assign(new Error('missing'), {code: 'ENOENT'}))
    expect(await pending).toMatchObject({error: {code: 'python-analyzer-unavailable'}, ok: false})
  })
  it('should terminate the analyzer when initialization is rejected', async () => {
    initialize.mockRejectedValue(new Error('Initialization failed'))
    expect(await service.lookupSymbols(path, 'greet()', 0, 'definition')).toMatchObject({
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
    const pending = service.lookupSymbols(path, 'main()', 0, 'definition')
    await requested.promise
    service.dispose()
    expect(await pending).toMatchObject({error: {code: 'python-analysis-failed'}, ok: false})
    expect(process).toHaveProperty('kill', expect.any(Function))
    expect(Reflect.get(process, 'kill')).toHaveBeenCalledTimes(1)
  })
  it('should initialize Python definitions and request configuration before navigation', async () => {
    await service.lookupSymbols(path, 'greet()', 0, 'definition')
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
})
