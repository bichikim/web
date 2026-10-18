/** @vitest-environment node */
import {existsSync} from 'node:fs'
import {join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import analyzers from '../../../../rust-analyzers.json' with {type: 'json'}
import {ensureAnalyzer} from '../ensure-analyzer'
import {resolveAnalyzer} from '../resolve-analyzer'

vi.mock('node:fs', () => ({existsSync: vi.fn()}))
vi.mock('node:os', () => ({homedir: vi.fn(() => '/user/home')}))
vi.mock('../ensure-analyzer', () => ({ensureAnalyzer: vi.fn()}))

describe('resolveAnalyzer', () => {
  beforeEach(() => {
    vi.stubEnv('RUST_ANALYZER_BINARY', '')
    vi.stubEnv('CODEX_HOME', '/custom/codex')
    vi.mocked(existsSync).mockReturnValue(false)
    vi.mocked(ensureAnalyzer).mockResolvedValue('/cache/analyzer')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })
  it('should use an explicitly configured executable without downloading', async () => {
    vi.stubEnv('RUST_ANALYZER_BINARY', '/tools/analyzer')
    expect(await resolveAnalyzer()).toBe('/tools/analyzer')
    expect(ensureAnalyzer).not.toHaveBeenCalled()
    expect(existsSync).not.toHaveBeenCalled()
  })
  it('should retain the bundled analyzer without downloading', async () => {
    vi.mocked(existsSync).mockReturnValueOnce(true)
    const path = await resolveAnalyzer()
    const candidate = vi.mocked(existsSync).mock.calls[0]![0]
    expect(candidate).toBeInstanceOf(URL)
    expect(path).toBe(fileURLToPath(String(candidate)))
    expect(ensureAnalyzer).not.toHaveBeenCalled()
  })
  it.each(['/custom/codex', ''])(
    'should download the current host analyzer using CODEX_HOME %s',
    async (home) => {
      vi.stubEnv('CODEX_HOME', home)
      expect(await resolveAnalyzer()).toBe('/cache/analyzer')
      expect(ensureAnalyzer).toHaveBeenCalledWith({
        asset: analyzers.assets.find(({host}) => host === `${process.platform}-${process.arch}`),
        cacheRoot: join(resolve(home || '/user/home/.codex'), 'cache/codex-code-viewer/rust'),
        version: analyzers.version,
      })
    },
  )
})
