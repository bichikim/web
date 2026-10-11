/** @vitest-environment node */
import {mkdir, readFile, rm, writeFile} from 'node:fs/promises'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {installPlugin} from '../install-plugin'
import {runCodex} from '../run-codex'

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(),
  readFile: vi.fn(),
  rm: vi.fn(),
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
  vi.mocked(runCodex).mockResolvedValueOnce(JSON.stringify({installed: []}))
})

describe('installPlugin', () => {
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
    expect(runCodex).toHaveBeenNthCalledWith(2, {
      ...options,
      args: [
        'plugin',
        'marketplace',
        'add',
        '/user/codex home/marketplace-sources/winter-love-code-viewer-npm',
        '--json',
      ],
    })
    expect(runCodex).toHaveBeenNthCalledWith(3, {
      ...options,
      args: ['plugin', 'add', 'codex-code-viewer@winter-love-code-viewer-npm', '--json'],
    })
  })

  it('should remove a previous Code Viewer only after its replacement is installed', async () => {
    vi.mocked(runCodex).mockReset().mockResolvedValue('')
    vi.mocked(runCodex).mockResolvedValueOnce(
      JSON.stringify({
        installed: [
          {pluginId: 'codex-code-viewer@winter-love-plugins'},
          {pluginId: 'other@winter-love-plugins'},
        ],
      }),
    )
    await installPlugin(options)
    expect(runCodex).toHaveBeenNthCalledWith(4, {
      ...options,
      args: ['plugin', 'remove', 'codex-code-viewer@winter-love-plugins', '--json'],
    })
    expect(runCodex).toHaveBeenCalledTimes(4)
  })

  it('should retain the previous installation when the new install fails', async () => {
    vi.mocked(runCodex)
      .mockReset()
      .mockResolvedValueOnce(
        JSON.stringify({installed: [{pluginId: 'codex-code-viewer@winter-love-plugins'}]}),
      )
      .mockResolvedValueOnce('')
      .mockRejectedValueOnce(new Error('npm unavailable'))
    await expect(installPlugin(options)).rejects.toThrow('npm unavailable')
    expect(runCodex).toHaveBeenCalledTimes(3)
    expect(rm).toHaveBeenCalledWith(expect.stringContaining('marketplace.json'), {force: true})
  })

  it('should not create a marketplace when the Codex CLI is unavailable', async () => {
    vi.mocked(runCodex).mockReset().mockRejectedValueOnce(new Error('Codex CLI unavailable'))
    await expect(installPlugin(options)).rejects.toThrow('Codex CLI unavailable')
    expect(mkdir).toHaveBeenCalledExactlyOnceWith(options.home, {recursive: true})
    expect(writeFile).not.toHaveBeenCalled()
  })

  it('should restore the previous npm catalog when updating fails', async () => {
    vi.mocked(readFile).mockResolvedValue('previous npm catalog')
    vi.mocked(runCodex)
      .mockReset()
      .mockResolvedValueOnce(JSON.stringify({installed: []}))
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
    vi.mocked(readFile).mockResolvedValue(previous)
    await installPlugin(options)
    expect(rm).toHaveBeenCalledWith(
      '/user/codex home/marketplace-sources/winter-love-code-viewer-npm/plugins/0.0.9-abcdef',
      {force: true, recursive: true},
    )
    expect(vi.mocked(rm).mock.invocationCallOrder[0]).toBeGreaterThan(
      vi.mocked(runCodex).mock.invocationCallOrder[2]!,
    )
  })

  it('should keep the previous source when replacement installation fails', async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        name: 'winter-love-code-viewer-npm',
        plugins: [
          {name: 'codex-code-viewer', source: {path: './plugins/0.0.9-abcdef', source: 'local'}},
        ],
      }),
    )
    vi.mocked(runCodex)
      .mockReset()
      .mockResolvedValueOnce(JSON.stringify({installed: []}))
      .mockResolvedValueOnce('')
      .mockRejectedValueOnce(new Error('install failed'))
    await expect(installPlugin(options)).rejects.toThrow('install failed')
    expect(rm).not.toHaveBeenCalled()
  })
})
