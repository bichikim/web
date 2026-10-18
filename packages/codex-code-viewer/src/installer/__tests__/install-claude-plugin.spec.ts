/** @vitest-environment node */
import {mkdir, mkdtemp, rename, rm, writeFile} from 'node:fs/promises'
import {beforeEach, expect, it, vi} from 'vitest'
import {installClaudePlugin} from '../install-claude-plugin'
import {prepareClaudePlugin} from '../prepare-claude-plugin'
import {runClaude} from '../run-claude'
import {readClaudeRuntime} from '../read-claude-runtime'

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(),
  mkdtemp: vi.fn(),
  rename: vi.fn(),
  rm: vi.fn(),
  writeFile: vi.fn(),
}))
vi.mock('../read-claude-runtime', () => ({readClaudeRuntime: vi.fn()}))
vi.mock('../prepare-claude-plugin', () => ({prepareClaudePlugin: vi.fn()}))
vi.mock('../run-claude', () => ({runClaude: vi.fn()}))
const options = {
  binary: '/bin/claude',
  home: '/user/.claude',
  packageRoot: '/package',
  version: '1.0.0',
}
const root = '/user/.claude/code-viewer/marketplace'
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(mkdtemp).mockResolvedValue('/user/.claude/code-viewer/.install-123')
  vi.mocked(readClaudeRuntime).mockResolvedValue(Buffer.from('archive'))
  vi.mocked(rename).mockResolvedValue(undefined)
  vi.mocked(runClaude).mockImplementation(async ({args}) =>
    args[0] === '--version' ? '2.1.296 (Claude Code)' : args.includes('--json') ? '[]' : 'ok',
  )
})

it('should validate and register a persistent plugin through the official CLI', async () => {
  const application = await installClaudePlugin(options)
  expect(application).toBe(`${root}/code-viewer/runtime/Code Viewer Attachment.app`)
  expect(readClaudeRuntime).toHaveBeenCalledWith({
    archive: undefined,
    directory: '/user/.claude/code-viewer/downloads',
    packageRoot: '/package',
    version: '1.0.0',
  })
  expect(prepareClaudePlugin).toHaveBeenCalledWith({
    archive: Buffer.from('archive'),
    root: '/user/.claude/code-viewer/.install-123/code-viewer',
    version: '1.0.0',
  })
  expect(runClaude).toHaveBeenCalledWith({...options, args: ['plugin', 'marketplace', 'add', root]})
  expect(runClaude).toHaveBeenCalledWith({
    ...options,
    args: ['plugin', 'install', 'code-viewer@winter-love-code-viewer-npm', '--scope', 'user'],
  })
  expect(writeFile).toHaveBeenCalledExactlyOnceWith(
    expect.stringContaining('marketplace.json'),
    expect.stringContaining('"source": "./code-viewer"'),
  )
  expect(vi.mocked(runClaude).mock.calls.some(([value]) => value.args.includes('enable'))).toBe(
    false,
  )
  expect(mkdir).not.toHaveBeenCalledWith(expect.stringContaining('mcp'), expect.anything())
})

it('should disable only the uploaded duplicate after replacement succeeds and keep its files', async () => {
  vi.mocked(runClaude).mockImplementation(async ({args}) => {
    if (args[0] === '--version') {
      return '2.1.296'
    }
    if (args[1] === 'list') {
      return JSON.stringify([
        {enabled: true, id: 'code-viewer@local-desktop-app-uploads', scope: 'user'},
        {enabled: true, id: 'other@local-desktop-app-uploads', scope: 'user'},
      ])
    }
    return args.includes('--json') ? '[]' : 'ok'
  })
  await installClaudePlugin(options)
  expect(runClaude).toHaveBeenLastCalledWith({
    ...options,
    args: ['plugin', 'disable', 'code-viewer@local-desktop-app-uploads', '--scope', 'user'],
  })
  expect(rm).not.toHaveBeenCalledWith(
    expect.stringContaining('local-desktop-app-uploads'),
    expect.anything(),
  )
})

it('should update its registered plugin without adding another marketplace', async () => {
  vi.mocked(runClaude).mockImplementation(async ({args}) => {
    if (args[0] === '--version') {
      return '2.1.296'
    }
    if (args[1] === 'list') {
      return JSON.stringify([
        {enabled: true, id: 'code-viewer@winter-love-code-viewer-npm', scope: 'user'},
      ])
    }
    if (args.includes('--json')) {
      return JSON.stringify([{name: 'winter-love-code-viewer-npm', path: root}])
    }
    return 'ok'
  })
  await installClaudePlugin(options)
  expect(runClaude).toHaveBeenCalledWith({
    ...options,
    args: ['plugin', 'update', 'code-viewer@winter-love-code-viewer-npm', '--scope', 'user'],
  })
  expect(vi.mocked(runClaude).mock.calls.some(([value]) => value.args.includes('add'))).toBe(false)
})

it.each(['1.9.0', '2.0.900', '2.1.286'])(
  'should reject unsupported CLI %s without changing files',
  async (version) => {
    vi.mocked(runClaude).mockResolvedValue(version)
    await expect(installClaudePlugin(options)).rejects.toThrow('2.1.287')
    expect(mkdir).not.toHaveBeenCalled()
  },
)

it('should leave an existing catalog at a different location untouched', async () => {
  vi.mocked(runClaude).mockImplementation(async ({args}) =>
    args[0] === '--version'
      ? '2.1.296'
      : args[1] === 'list'
        ? '[]'
        : JSON.stringify([{name: 'winter-love-code-viewer-npm', path: '/other/catalog'}]),
  )
  await expect(installClaudePlugin(options)).rejects.toThrow('다른 위치')
  expect(rename).not.toHaveBeenCalled()
})

it('should restore files and registration when installation fails', async () => {
  vi.mocked(runClaude).mockImplementation(async ({args}) => {
    if (args[1] === 'install') {
      throw new Error('install failed')
    }
    return args[0] === '--version' ? '2.1.296' : args.includes('--json') ? '[]' : 'ok'
  })
  await expect(installClaudePlugin(options)).rejects.toThrow('install failed')
  expect(rename).toHaveBeenLastCalledWith('/user/.claude/code-viewer/.install-123-previous', root)
  expect(runClaude).toHaveBeenLastCalledWith({
    args: ['plugin', 'marketplace', 'remove', 'winter-love-code-viewer-npm'],
    binary: options.binary,
    home: options.home,
    onStderr: undefined,
  })
  expect(vi.mocked(runClaude).mock.calls.some(([value]) => value.args.includes('disable'))).toBe(
    false,
  )
})

it('should restore previous files even when removing the failed registration also fails', async () => {
  vi.mocked(runClaude).mockImplementation(async ({args}) => {
    if (args[1] === 'install') {
      throw new Error('install failed')
    }
    if (args[1] === 'marketplace' && args[2] === 'remove') {
      throw new Error('registration cleanup failed')
    }
    return args[0] === '--version' ? '2.1.296' : args.includes('--json') ? '[]' : 'ok'
  })
  await expect(installClaudePlugin(options)).rejects.toBeInstanceOf(AggregateError)
  expect(rename).toHaveBeenLastCalledWith('/user/.claude/code-viewer/.install-123-previous', root)
  expect(rm).toHaveBeenCalledWith(root, {force: true, recursive: true})
})

it('should retain both cleanup failures when previous files cannot be restored', async () => {
  const installation = new Error('install failed')
  const registration = new Error('registration cleanup failed')
  const filesystem = new Error('filesystem cleanup failed')
  vi.mocked(runClaude).mockImplementation(async ({args}) => {
    if (args[1] === 'install') {
      throw installation
    }
    if (args[1] === 'marketplace' && args[2] === 'remove') {
      throw registration
    }
    return args[0] === '--version' ? '2.1.296' : args.includes('--json') ? '[]' : 'ok'
  })
  vi.mocked(rm).mockRejectedValueOnce(filesystem)
  await expect(installClaudePlugin(options)).rejects.toMatchObject({
    errors: [installation, expect.objectContaining({errors: [registration, filesystem]})],
  })
  expect(rename).not.toHaveBeenCalledWith('/user/.claude/code-viewer/.install-123-previous', root)
})

it('should leave installed files untouched when the archive does not match the installer', async () => {
  vi.mocked(prepareClaudePlugin).mockRejectedValue(new Error('version mismatch'))
  await expect(installClaudePlugin(options)).rejects.toThrow('version mismatch')
  expect(rename).not.toHaveBeenCalled()
})

it('should report a missing host artifact before writing configuration', async () => {
  vi.mocked(readClaudeRuntime).mockRejectedValue(new Error('darwin-arm64 missing archive'))
  await expect(installClaudePlugin(options)).rejects.toThrow('darwin-arm64')
  expect(writeFile).not.toHaveBeenCalled()
})
