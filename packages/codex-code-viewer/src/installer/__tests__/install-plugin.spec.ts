/** @vitest-environment node */
import {statSync} from 'node:fs'
import {mkdir, readFile, rm, stat, writeFile} from 'node:fs/promises'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {installPlugin} from '../install-plugin'
import {runCodex} from '../run-codex'

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(),
  readFile: vi.fn(),
  rm: vi.fn(),
  stat: vi.fn(),
  writeFile: vi.fn(),
}))
vi.mock('../run-codex', () => ({runCodex: vi.fn()}))

const options = {
  codex: '/Applications/Codex CLI/codex',
  home: '/user/codex home',
  version: '0.1.0',
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(readFile).mockRejectedValue(Object.assign(new Error('missing'), {code: 'ENOENT'}))
  vi.mocked(runCodex).mockResolvedValue('')
  vi.mocked(stat).mockResolvedValue(statSync(new URL(import.meta.url)))
})

describe('installPlugin', () => {
  it('should unregister a newly added marketplace when package installation fails', async () => {
    vi.mocked(runCodex)
      .mockReset()
      .mockResolvedValueOnce('')
      .mockRejectedValueOnce(new Error('download failed'))
      .mockResolvedValueOnce('')
    await expect(installPlugin(options)).rejects.toThrow('download failed')
    expect(runCodex).toHaveBeenLastCalledWith({
      ...options,
      args: ['plugin', 'marketplace', 'remove', 'winter-love-code-viewer-npm', '--json'],
    })
    expect(vi.mocked(rm).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(runCodex).mock.invocationCallOrder[2]!,
    )
  })

  it('should restore the original marketplace source when package installation fails', async () => {
    vi.mocked(readFile).mockResolvedValueOnce(
      '[marketplaces.winter-love-code-viewer-npm]\nsource_type = "local"\nsource = "/previous/catalog"\n',
    )
    vi.mocked(runCodex)
      .mockReset()
      .mockResolvedValueOnce('')
      .mockRejectedValueOnce(new Error('download failed'))
      .mockResolvedValueOnce('')
    await expect(installPlugin(options)).rejects.toThrow('download failed')
    expect(runCodex).toHaveBeenLastCalledWith({
      ...options,
      args: ['plugin', 'marketplace', 'add', '/previous/catalog', '--json'],
    })
  })

  it('should unregister only the missing legacy local marketplace after replacement succeeds', async () => {
    vi.mocked(readFile).mockResolvedValueOnce(
      '[marketplaces.winter-love-code-viewer]\nsource_type = "local"\nsource = "/missing/development/dist"\n',
    )
    vi.mocked(stat).mockRejectedValue(Object.assign(new Error('missing'), {code: 'ENOENT'}))
    await installPlugin(options)
    expect(runCodex).toHaveBeenLastCalledWith({
      ...options,
      args: ['plugin', 'marketplace', 'remove', 'winter-love-code-viewer', '--json'],
    })
    expect(vi.mocked(stat).mock.invocationCallOrder[0]).toBeGreaterThan(
      vi.mocked(runCodex).mock.invocationCallOrder[1]!,
    )
  })

  it('should retain the legacy marketplace when its local source still exists', async () => {
    vi.mocked(readFile).mockResolvedValueOnce(
      '[marketplaces.winter-love-code-viewer]\nsource_type = "local"\nsource = "/existing/development/dist"\n',
    )
    await installPlugin(options)
    expect(stat).toHaveBeenCalledWith('/existing/development/dist')
    expect(runCodex).toHaveBeenCalledTimes(4)
  })

  it('should retain a legacy Git marketplace without checking its path', async () => {
    vi.mocked(readFile).mockResolvedValueOnce(
      '[marketplaces.winter-love-code-viewer]\nsource_type = "git"\nsource = "https://example.com/plugins.git"\n',
    )
    await installPlugin(options)
    expect(stat).not.toHaveBeenCalled()
    expect(runCodex).toHaveBeenCalledTimes(4)
  })

  it('should report each stage before its work begins', async () => {
    const onProgress = vi.fn()
    await installPlugin({...options, onProgress})
    expect(onProgress.mock.calls).toEqual([
      ['preparing'],
      ['registering'],
      ['installing'],
      ['cleaning'],
    ])
    expect(onProgress.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(mkdir).mock.invocationCallOrder[0]!,
    )
    expect(onProgress.mock.invocationCallOrder[1]).toBeLessThan(
      vi.mocked(runCodex).mock.invocationCallOrder[0]!,
    )
    expect(onProgress.mock.invocationCallOrder[2]).toBeLessThan(
      vi.mocked(runCodex).mock.invocationCallOrder[1]!,
    )
    expect(onProgress.mock.invocationCallOrder[3]).toBeGreaterThan(
      vi.mocked(runCodex).mock.invocationCallOrder[1]!,
    )
    expect(onProgress.mock.invocationCallOrder[3]).toBeLessThan(
      vi.mocked(runCodex).mock.invocationCallOrder[2]!,
    )
  })

  it('should report restoration without reporting cleanup when installation fails', async () => {
    const onProgress = vi.fn()
    vi.mocked(runCodex)
      .mockReset()
      .mockResolvedValueOnce('')
      .mockRejectedValueOnce(new Error('download failed'))
    await expect(installPlugin({...options, onProgress})).rejects.toThrow('download failed')
    expect(onProgress.mock.calls).toEqual([
      ['preparing'],
      ['registering'],
      ['installing'],
      ['restoring'],
    ])
    expect(onProgress.mock.invocationCallOrder[3]).toBeLessThan(
      vi.mocked(rm).mock.invocationCallOrder[0]!,
    )
  })

  it('should forward Codex progress output during installation', async () => {
    const onStderr = vi.fn()
    vi.mocked(runCodex).mockImplementation(async ({args, onStderr: report}) => {
      if (args[1] === 'add') {
        report?.('Downloading package…\n')
      }
      return ''
    })
    await installPlugin({...options, onStderr})
    expect(onStderr).toHaveBeenCalledExactlyOnceWith('Downloading package…\n')
  })

  it('should install this version from a persistent npm marketplace', async () => {
    await installPlugin(options)
    expect(mkdir).toHaveBeenNthCalledWith(1, options.home, {recursive: true})
    expect(vi.mocked(mkdir).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(runCodex).mock.invocationCallOrder[0]!,
    )
    const [path, content] = vi.mocked(writeFile).mock.calls[0]!
    expect(path).toBe(
      '/user/codex home/marketplace-sources/winter-love-code-viewer-npm/.agents/plugins/marketplace.json',
    )
    expect(JSON.parse(String(content))).toMatchObject({
      name: 'winter-love-code-viewer-npm',
      plugins: [
        {source: {package: '@winter-love/codex-code-viewer', source: 'npm', version: '0.1.0'}},
      ],
    })
    expect(runCodex).toHaveBeenNthCalledWith(1, {
      ...options,
      args: [
        'plugin',
        'marketplace',
        'add',
        '/user/codex home/marketplace-sources/winter-love-code-viewer-npm',
        '--json',
      ],
    })
    expect(runCodex).toHaveBeenNthCalledWith(2, {
      ...options,
      args: ['plugin', 'add', 'codex-code-viewer@winter-love-code-viewer-npm', '--json'],
    })
  })

  it('should remove a previous Code Viewer only after its replacement is installed', async () => {
    await installPlugin(options)
    expect(runCodex).toHaveBeenNthCalledWith(3, {
      ...options,
      args: ['plugin', 'remove', 'codex-code-viewer@winter-love-plugins', '--json'],
    })
    expect(runCodex).toHaveBeenNthCalledWith(4, {
      ...options,
      args: ['plugin', 'remove', 'codex-code-viewer@winter-love-code-viewer', '--json'],
    })
    expect(runCodex).toHaveBeenCalledTimes(4)
  })

  it('should install without loading a stale development marketplace', async () => {
    vi.mocked(runCodex).mockImplementation(async ({args}) => {
      if (args[1] === 'list') {
        throw new Error(
          'winter-love-code-viewer: marketplace root does not contain a supported manifest',
        )
      }
      return ''
    })
    await installPlugin(options)
    expect(runCodex).toHaveBeenCalledWith({
      ...options,
      args: ['plugin', 'add', 'codex-code-viewer@winter-love-code-viewer-npm', '--json'],
    })
  })

  it('should retain the previous installation when the new install fails', async () => {
    vi.mocked(runCodex)
      .mockReset()
      .mockResolvedValueOnce('')
      .mockRejectedValueOnce(new Error('npm unavailable'))
    await expect(installPlugin(options)).rejects.toThrow('npm unavailable')
    expect(runCodex).toHaveBeenCalledTimes(3)
    expect(rm).toHaveBeenCalledWith(expect.stringContaining('marketplace.json'), {force: true})
  })

  it('should remove the new catalog when the Codex CLI is unavailable', async () => {
    vi.mocked(runCodex).mockReset().mockRejectedValueOnce(new Error('Codex CLI unavailable'))
    await expect(installPlugin(options)).rejects.toThrow('Codex CLI unavailable')
    expect(runCodex).toHaveBeenCalledTimes(1)
    expect(rm).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('marketplace.json'), {
      force: true,
    })
  })

  it('should restore the previous npm catalog when updating fails', async () => {
    vi.mocked(readFile)
      .mockRejectedValueOnce(Object.assign(new Error('missing'), {code: 'ENOENT'}))
      .mockResolvedValue('previous npm catalog')
    vi.mocked(runCodex)
      .mockReset()
      .mockResolvedValueOnce('')
      .mockRejectedValueOnce(new Error('download failed'))
    await expect(installPlugin(options)).rejects.toThrow('download failed')
    expect(writeFile).toHaveBeenLastCalledWith(
      expect.stringContaining('marketplace.json'),
      'previous npm catalog',
      'utf8',
    )
  })

  it('should remove the superseded installer source only after its replacement is installed', async () => {
    const previous = JSON.stringify({
      name: 'winter-love-code-viewer-npm',
      plugins: [
        {name: 'codex-code-viewer', source: {path: './plugins/0.0.9-abcdef', source: 'local'}},
      ],
    })
    vi.mocked(readFile)
      .mockRejectedValueOnce(Object.assign(new Error('missing'), {code: 'ENOENT'}))
      .mockResolvedValue(previous)
    await installPlugin(options)
    expect(rm).toHaveBeenCalledWith(
      '/user/codex home/marketplace-sources/winter-love-code-viewer-npm/plugins/0.0.9-abcdef',
      {force: true, recursive: true},
    )
    expect(vi.mocked(rm).mock.invocationCallOrder[0]).toBeGreaterThan(
      vi.mocked(runCodex).mock.invocationCallOrder[1]!,
    )
  })

  it('should keep the previous source when replacement installation fails', async () => {
    vi.mocked(readFile)
      .mockRejectedValueOnce(Object.assign(new Error('missing'), {code: 'ENOENT'}))
      .mockResolvedValue(
        JSON.stringify({
          name: 'winter-love-code-viewer-npm',
          plugins: [
            {name: 'codex-code-viewer', source: {path: './plugins/0.0.9-abcdef', source: 'local'}},
          ],
        }),
      )
    vi.mocked(runCodex)
      .mockReset()
      .mockResolvedValueOnce('')
      .mockRejectedValueOnce(new Error('install failed'))
    await expect(installPlugin(options)).rejects.toThrow('install failed')
    expect(rm).not.toHaveBeenCalled()
  })

  it('should preserve both installation and restoration errors when rollback fails', async () => {
    const installation = new Error('download failed')
    const restoration = new Error('configuration is locked')
    vi.mocked(runCodex)
      .mockReset()
      .mockResolvedValueOnce('')
      .mockRejectedValueOnce(installation)
      .mockRejectedValueOnce(restoration)
    await expect(installPlugin(options)).rejects.toMatchObject({
      cause: installation,
      errors: [installation, restoration],
      message: expect.stringContaining('configuration is locked\n최초 설치 오류: download failed'),
    })
  })
})
