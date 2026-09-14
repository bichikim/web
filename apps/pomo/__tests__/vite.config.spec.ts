/** @vitest-environment node */
import {existsSync} from 'node:fs'
import {resolve} from 'node:path'
import {loadConfigFromFile} from 'vite'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const root = resolve('apps/pomo')
const modelPaths = [
  'assets/train-cabin/scene.glb',
  'assets/character-studio/haru.vrm',
  'assets/character-studio/vroid.glb',
  'character-studio/pomo.glb',
  'character-studio/scene.glb',
]

beforeEach(() => {
  vi.spyOn(process, 'cwd').mockReturnValue(root)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

it.each(['web', 'apps-in-toss', 'desktop'])(
  'should exclude development models from the %s production public directories',
  async (target) => {
    vi.stubEnv('POMO_BUILD_TARGET', target)
    const result = await loadConfigFromFile(
      {command: 'build', mode: 'production'},
      resolve(root, 'vite.config.ts'),
      root,
    )
    expect(result).not.toBeNull()
    const directories = [
      resolve(root, 'public'),
      ...(result?.config.nitro?.publicAssets ?? []).map((asset) => resolve(root, asset.dir)),
    ]
    expect(
      directories.flatMap((directory) =>
        modelPaths.filter((model) => existsSync(resolve(directory, model))),
      ),
    ).toEqual([])
  },
)

it('should keep every development model available at its existing URL in development', async () => {
  const result = await loadConfigFromFile(
    {command: 'serve', mode: 'development'},
    resolve(root, 'vite.config.ts'),
    root,
  )
  const directories = [
    resolve(root, 'public'),
    ...(result?.config.nitro?.publicAssets ?? [])
      .filter((asset) => !asset.baseURL || asset.baseURL === '/')
      .map((asset) => resolve(root, asset.dir)),
  ]
  expect(result).not.toBeNull()
  expect(
    modelPaths.every((model) =>
      directories.some((directory) => existsSync(resolve(directory, model))),
    ),
  ).toBe(true)
})
