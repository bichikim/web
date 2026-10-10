/** @vitest-environment node */
import {EventEmitter} from 'node:events'
import {PassThrough} from 'node:stream'
import {pathToFileURL} from 'node:url'
import {createMessageConnection} from 'vscode-jsonrpc/node.js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createRubyService} from '../create-ruby-service'

vi.mock('node:child_process', () => ({spawn: vi.fn()}))
import {spawn} from 'node:child_process'

describe('createRubyService', () => {
  let child: EventEmitter
  let server: ReturnType<typeof createMessageConnection>
  let service: ReturnType<typeof createRubyService>
  const initialize = vi.fn()
  const definition = vi.fn()
  const opened = vi.fn()
  const changed = vi.fn()
  const root = '/workspace/example'
  const path = `${root}/main.rb`
  beforeEach(() => {
    vi.stubEnv('SOLARGRAPH_BINARY', '')
    vi.stubEnv('RUBY_BINARY', '')
    const input = new PassThrough()
    const output = new PassThrough()
    child = Object.assign(new EventEmitter(), {
      kill: vi.fn(),
      stderr: new PassThrough(),
      stdin: input,
      stdout: output,
    })
    vi.mocked(spawn).mockReturnValue(child as ReturnType<typeof spawn>)
    server = createMessageConnection(input, output)
    initialize.mockReturnValue({capabilities: {textDocumentSync: {change: 2}}})
    definition.mockReturnValue([
      {
        range: {end: {character: 12, line: 1}, start: {character: 6, line: 1}},
        uri: pathToFileURL(`${root}/report.rb`).href,
      },
    ])
    server.onRequest('initialize', initialize)
    server.onNotification('textDocument/didOpen', opened)
    server.onNotification('textDocument/didChange', changed)
    server.onRequest('textDocument/definition', definition)
    server.listen()
    service = createRubyService(root)
  })
  afterEach(() => {
    service.dispose()
    server.dispose()
    vi.resetAllMocks()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })
  it('should negotiate codepoint positions and launch the selected Ruby gem', async () => {
    const source = '# 한글 🦊\r\nReport.new\n'
    expect(
      await service.lookupSymbols(path, source, source.indexOf('Report'), 'definition'),
    ).toEqual({
      ok: true,
      value: [{column: 7, line: 2, path: `${root}/report.rb`}],
    })
    expect(spawn).toHaveBeenCalledWith(
      'ruby',
      ['-r', 'rubygems', '-e', "load Gem.bin_path('solargraph', 'solargraph')", '--', 'stdio'],
      expect.objectContaining({cwd: root}),
    )
    expect(initialize.mock.calls[0][0]).toMatchObject({
      capabilities: expect.objectContaining({general: {positionEncodings: ['utf-32']}}),
      initializationOptions: {
        completion: false,
        definitions: true,
        diagnostics: false,
        formatting: false,
        hover: false,
        symbols: false,
      },
    })
    expect(opened).toHaveBeenCalledWith(
      expect.objectContaining({textDocument: expect.objectContaining({languageId: 'ruby'})}),
    )
    await service.lookupSymbols(path, 'label = "🦊"; Report.new', 14, 'definition')
    expect(definition.mock.calls.at(-1)?.[0]).toMatchObject({position: {character: 13, line: 0}})
  })
  it('should replace edited Ruby source using its previous codepoint range', async () => {
    await service.lookupSymbols(path, '# 🦊\r\nReport.new; "🦊"', 7, 'definition')
    await service.lookupSymbols(path, '# changed\nReport.new', 10, 'definition')
    expect(changed).toHaveBeenCalledWith({
      contentChanges: [
        {
          range: {end: {character: 15, line: 1}, start: {character: 0, line: 0}},
          text: '# changed\nReport.new',
        },
      ],
      textDocument: {uri: pathToFileURL(path).href, version: 2},
    })
  })
  it('should use a configured analyzer executable using its stdio mode', () => {
    service.dispose()
    vi.stubEnv('SOLARGRAPH_BINARY', '/custom/solargraph')
    service = createRubyService(root)
    expect(spawn).toHaveBeenLastCalledWith(
      '/custom/solargraph',
      ['stdio'],
      expect.objectContaining({cwd: root}),
    )
  })
  it('should use a configured Ruby interpreter for the gem launcher', () => {
    service.dispose()
    vi.stubEnv('RUBY_BINARY', '/custom/ruby')
    service = createRubyService(root)
    expect(spawn).toHaveBeenLastCalledWith(
      '/custom/ruby',
      expect.any(Array),
      expect.objectContaining({cwd: root}),
    )
  })
  it('should report unavailable analyzers and finish pending startup', async () => {
    const pending = service.lookupSymbols(path, 'Report.new', 0, 'definition')
    child.emit('error', new Error('missing Ruby'))
    expect(await pending).toMatchObject({error: {code: 'ruby-analyzer-unavailable'}, ok: false})
  })
  it('should release pending definitions and terminate the analyzer on disposal', async () => {
    const requested = Promise.withResolvers<void>()
    definition.mockImplementation(() => {
      requested.resolve()
      return new Promise(() => {})
    })
    const pending = service.lookupSymbols(path, 'Report.new', 0, 'definition')
    await requested.promise
    service.dispose()
    expect(await pending).toMatchObject({error: {code: 'ruby-analysis-failed'}, ok: false})
    expect(Reflect.get(child, 'kill')).toHaveBeenCalledOnce()
  })
  it('should terminate the Ruby process group including bundle setup children on Unix', () => {
    vi.stubGlobal('process', {...globalThis.process, kill: vi.fn(), platform: 'darwin'})
    Object.assign(child, {pid: 12345})
    service.dispose()
    expect(globalThis.process.kill).toHaveBeenCalledWith(-12345, 'SIGTERM')
    vi.unstubAllGlobals()
  })
})
