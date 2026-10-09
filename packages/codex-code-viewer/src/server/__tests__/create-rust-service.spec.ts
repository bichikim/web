/** @vitest-environment node */
import {EventEmitter} from 'node:events'
import {PassThrough} from 'node:stream'
import {pathToFileURL} from 'node:url'
import {createMessageConnection} from 'vscode-jsonrpc/node.js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createRustService} from '../create-rust-service'

const {spawn} = vi.hoisted(() => ({spawn: vi.fn()}))
vi.mock('node:child_process', () => ({spawn}))

describe('createRustService', () => {
  let process: EventEmitter
  let server: ReturnType<typeof createMessageConnection>
  let service: ReturnType<typeof createRustService>
  let initialize: ReturnType<typeof vi.fn<(value: unknown) => unknown>>
  let definition: ReturnType<typeof vi.fn<(value: unknown) => unknown>>
  let opened: unknown[]
  let changed: unknown[]
  const root = '/workspace/example'
  const path = `${root}/src/main.rs`
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
        uri: pathToFileURL(`${root}/src/math.rs`).href,
      },
    ])
    opened = []
    changed = []
    server.onRequest('initialize', (value: unknown) => initialize(value))
    server.onNotification('initialized', () =>
      server.sendNotification('experimental/serverStatus', {health: 'ok', quiescent: true}),
    )
    server.onNotification('textDocument/didOpen', (value) => opened.push(value))
    server.onNotification('textDocument/didChange', (value) => changed.push(value))
    server.onRequest('textDocument/definition', (value: unknown) => definition(value))
    server.listen()
    service = createRustService({
      crates: [
        {
          cfg: [],
          deps: [],
          display_name: 'example',
          edition: '2021',
          is_workspace_member: true,
          root_module: path,
          source: {exclude_dirs: [], include_dirs: [root]},
        },
      ],
      directory: root,
    })
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
      value: [{column: 8, line: 3, path: `${root}/src/math.rs`}],
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
  it('should wait for the analysis completion event before resolving a definition', async () => {
    const started = Promise.withResolvers<void>()
    server.onNotification('initialized', () => {
      started.resolve()
      return server.sendNotification('experimental/serverStatus', {health: 'ok', quiescent: false})
    })
    const pending = service.lookupSymbols(path, 'main()', 0, 'definition')
    await started.promise
    expect(definition).not.toHaveBeenCalled()
    await server.sendNotification('experimental/serverStatus', {health: 'ok', quiescent: true})
    expect(await pending).toMatchObject({ok: true})
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
    expect(await pending).toMatchObject({error: {code: 'rust-analysis-failed'}, ok: false})
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
      error: {code: 'rust-analysis-failed'},
      ok: false,
    })
  })
  it('should report missing analyzer and finish pending initialization', async () => {
    const pending = service.lookupSymbols(path, 'main()', 0, 'definition')
    process.emit('error', Object.assign(new Error('missing'), {code: 'ENOENT'}))
    expect(await pending).toMatchObject({error: {code: 'rust-analyzer-unavailable'}, ok: false})
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
    expect(await pending).toMatchObject({error: {code: 'rust-analysis-failed'}, ok: false})
    expect(process).toHaveProperty('kill', expect.any(Function))
    expect(Reflect.get(process, 'kill')).toHaveBeenCalledTimes(1)
  })
  it('should disable project execution and use the server file watcher', async () => {
    await service.lookupSymbols(path, 'main()', 0, 'definition')
    expect(initialize.mock.calls[0][0]).toMatchObject({
      initializationOptions: {
        cargo: {buildScripts: {enable: false}, noDeps: true, sysroot: null},
        checkOnSave: false,
        files: {watcher: 'server'},
        linkedProjects: [{crates: [{root_module: path}]}],
        procMacro: {enable: false},
      },
    })
  })
})
