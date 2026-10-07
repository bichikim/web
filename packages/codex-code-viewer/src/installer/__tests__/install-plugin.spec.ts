import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {installPlugin} from '../install-plugin'
import {runCodex} from '../run-codex'

vi.mock('node:fs/promises', () => ({mkdir: vi.fn(), readFile: vi.fn(), writeFile: vi.fn()}))
vi.mock('../run-codex', () => ({runCodex: vi.fn()}))

const options = {codex: '/Applications/Codex CLI/codex', home: '/user/codex home', version: '0.1.0'}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(readFile).mockRejectedValue(Object.assign(new Error('missing'), {code: 'ENOENT'}))
  vi.mocked(runCodex).mockResolvedValue('')
  vi.mocked(runCodex).mockResolvedValueOnce(JSON.stringify({installed: []}))
})

describe('installPlugin', () => {
  it('should register a persistent npm marketplace without a GitHub source', async () => {
    await installPlugin(options)
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
  })

  it('should not create a marketplace when the Codex CLI is unavailable', async () => {
    vi.mocked(runCodex).mockReset().mockRejectedValueOnce(new Error('Codex CLI unavailable'))
    await expect(installPlugin(options)).rejects.toThrow('Codex CLI unavailable')
    expect(mkdir).not.toHaveBeenCalled()
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
})
