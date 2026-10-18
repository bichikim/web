/** @vitest-environment node */
import {existsSync} from 'node:fs'
import {join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import analyzers from '../../../../typescript-analyzers.json' with {type: 'json'}
import {ensureTypescriptAnalyzer} from '../ensure-typescript-analyzer'
import {resolveNativeBinary} from '../resolve-native-binary'

vi.mock('node:fs', () => ({existsSync: vi.fn()}))
vi.mock('../ensure-typescript-analyzer', () => ({ensureTypescriptAnalyzer: vi.fn()}))
describe('resolveNativeBinary', () => {
  beforeEach(() => {
    vi.stubEnv('CODEX_HOME', '/custom/codex')
    vi.mocked(existsSync).mockReturnValue(false)
    vi.mocked(ensureTypescriptAnalyzer).mockResolvedValue('/cache/tsc')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })
  it('should retain a development bundle without downloading', async () => {
    vi.mocked(existsSync).mockReturnValue(true)
    expect(await resolveNativeBinary()).toBe(
      fileURLToPath(String(vi.mocked(existsSync).mock.calls[0]?.[0])),
    )
    expect(ensureTypescriptAnalyzer).not.toHaveBeenCalled()
  })
  it('should download only the pinned current host into the Codex cache', async () => {
    expect(await resolveNativeBinary()).toBe('/cache/tsc')
    expect(ensureTypescriptAnalyzer).toHaveBeenCalledWith({
      asset: analyzers.assets.find(({host}) => host === `${process.platform}-${process.arch}`),
      cacheRoot: join(resolve('/custom/codex'), 'cache/codex-code-viewer/typescript'),
      version: analyzers.version,
    })
  })
})
