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

it.each(['android', 'ios'] as const)(
  'should create a static %s configuration with the matching runtime target',
  async (target) => {
    vi.stubEnv('POMO_BUILD_TARGET', target)
    vi.stubEnv('POMO_RUNTIME_TARGET', target)

    const result = await loadConfigFromFile(
      {command: 'build', mode: 'production'},
      resolve(root, 'vite.config.ts'),
      root,
    )

    expect(result).not.toBeNull()
    expect(result?.config.build?.assetsInlineLimit).toBe(0)
    expect(result?.config.define).toMatchObject({
      'import.meta.env.VITE_POMO_IS_MOBILE': JSON.stringify(String(true)),
      'import.meta.env.VITE_POMO_RUNTIME_TARGET': JSON.stringify(target),
    })
    expect(result?.config.nitro?.preset).toBe('static')
    expect(result?.config.nitro?.prerender?.failOnError).toBe(true)
    expect(result?.config.nitro?.prerender?.routes).toEqual(
      expect.arrayContaining(['/dialogue', '/focus-room', '/focus-room-dialogue']),
    )
  },
)

it.each(['android', 'ios'] as const)(
  'should keep Vite HMR enabled for %s development',
  async (target) => {
    vi.stubEnv('POMO_RUNTIME_TARGET', target)

    const result = await loadConfigFromFile(
      {command: 'serve', mode: 'development'},
      resolve(root, 'vite.config.ts'),
      root,
    )

    expect(result).not.toBeNull()
    expect(result?.config.server?.hmr).toBe(true)
    expect(result?.config.nitro?.preset).toBeUndefined()
    expect(result?.config.nitro?.prerender?.failOnError).toBe(false)
    expect(result?.config.nitro?.prerender?.routes).not.toContain('/dialogue')
    expect(result?.config.build?.assetsInlineLimit).toBeUndefined()
  },
)

it.each([
  {build: 'android', message: 'POMO_RUNTIME_TARGET=android', runtime: ''},
  {build: 'android', message: 'POMO_RUNTIME_TARGET=android', runtime: 'ios'},
  {build: 'web', message: 'POMO_BUILD_TARGET=web', runtime: 'android'},
  {build: 'ios', message: 'Unsupported POMO_RUNTIME_TARGET: mobile', runtime: 'mobile'},
])('should reject an invalid mobile target pair', async ({build, runtime, message}) => {
  vi.stubEnv('POMO_BUILD_TARGET', build)
  vi.stubEnv('POMO_RUNTIME_TARGET', runtime)

  await expect(
    loadConfigFromFile(
      {command: 'build', mode: 'production'},
      resolve(root, 'vite.config.ts'),
      root,
    ),
  ).rejects.toThrow(message)
})

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
