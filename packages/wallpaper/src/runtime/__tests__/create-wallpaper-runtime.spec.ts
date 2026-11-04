import {beforeEach, expect, it, vi} from 'vitest'
import {
  createWallpaperRuntime,
  type WallpaperSurfacePort,
} from '@winter-love/wallpaper/runtime/create-wallpaper-runtime'
import {createMonitorWallpaper, type MonitorWallpaper} from '@winter-love/wallpaper/settings/model'

let surfaces: WallpaperSurfacePort
const website = (url: string): MonitorWallpaper => ({
  ...createMonitorWallpaper('first'),
  content: {mode: 'website', url},
})
beforeEach(() => {
  surfaces = {
    close: vi.fn(async () => undefined),
    navigate: vi.fn(async () => undefined),
    open: vi.fn(async (monitorId) => `surface-${monitorId}`),
    restore: vi.fn(async () => undefined),
    setInteraction: vi.fn(async () => undefined),
    setSurface: vi.fn(async () => undefined),
  }
})

it('should create a real surface before navigating to the configured website', async () => {
  const runtime = createWallpaperRuntime(surfaces)
  await runtime.synchronize({connectedIds: ['first'], settings: [website('https://example.com')]})
  expect(surfaces.setSurface).toHaveBeenCalledWith('surface-first', 'passThrough')
  expect(surfaces.navigate).toHaveBeenCalledWith('surface-first', 'https://example.com')
  expect(vi.mocked(surfaces.setSurface).mock.invocationCallOrder[0]).toBeLessThan(
    vi.mocked(surfaces.navigate).mock.invocationCallOrder[0]!,
  )
})

it('should restore the local renderer when switching from a website to a selected album', async () => {
  const runtime = createWallpaperRuntime(surfaces)
  await runtime.synchronize({connectedIds: ['first'], settings: [website('https://example.com')]})
  const album = createMonitorWallpaper('first')
  await runtime.synchronize({
    connectedIds: ['first'],
    settings: [
      {
        ...album,
        content: {
          mediaIds: ['image'],
          mode: 'album',
          order: 'sequential',
          photoSeconds: 10,
          transition: 'fade',
          videoMode: 'end',
        },
      },
    ],
  })
  expect(surfaces.restore).toHaveBeenCalledExactlyOnceWith('surface-first')
  expect(surfaces.open).toHaveBeenCalledTimes(1)
})

it('should toggle native input without resetting the live renderer', async () => {
  const runtime = createWallpaperRuntime(surfaces)
  const settings = website('https://example.com')
  await runtime.synchronize({connectedIds: ['first'], settings: [settings]})
  await runtime.synchronize({
    connectedIds: ['first'],
    settings: [{...settings, interaction: {activation: 'always'}}],
  })
  expect(surfaces.setInteraction).toHaveBeenLastCalledWith('surface-first', 'interactive')
  await runtime.synchronize({connectedIds: ['first'], settings: [settings]})
  expect(surfaces.setInteraction).toHaveBeenLastCalledWith('surface-first', 'passThrough')
  expect(surfaces.setInteraction).toHaveBeenCalledTimes(2)
  expect(surfaces.navigate).toHaveBeenCalledTimes(1)
  expect(surfaces.setSurface).toHaveBeenCalledTimes(1)
})

it('should close removed and disconnected wallpapers and release owned windows on disposal', async () => {
  const runtime = createWallpaperRuntime(surfaces)
  await runtime.synchronize({connectedIds: ['first'], settings: [website('https://example.com')]})
  await runtime.synchronize({connectedIds: [], settings: [website('https://example.com')]})
  expect(surfaces.close).toHaveBeenCalledWith('first', 'surface-first')
  await runtime.synchronize({connectedIds: ['first'], settings: [website('https://example.com')]})
  await runtime.dispose()
  expect(surfaces.close).toHaveBeenCalledTimes(2)
  await runtime.synchronize({connectedIds: ['first'], settings: [website('https://example.com')]})
  expect(surfaces.open).toHaveBeenCalledTimes(2)
})

it('should retry failed native navigation on the next synchronization', async () => {
  const runtime = createWallpaperRuntime(surfaces)
  vi.mocked(surfaces.navigate).mockRejectedValueOnce(new Error('navigation failed'))
  await expect(
    runtime.synchronize({connectedIds: ['first'], settings: [website('https://example.com')]}),
  ).rejects.toThrow('navigation failed')
  await runtime.synchronize({connectedIds: ['first'], settings: [website('https://example.com')]})
  expect(surfaces.navigate).toHaveBeenCalledTimes(2)
  expect(surfaces.open).toHaveBeenCalledTimes(1)
})

it('should finish every pending monitor before applying a snapshot after a partial failure', async () => {
  const started = Promise.withResolvers<void>()
  const navigation = Promise.withResolvers<void>()
  vi.mocked(surfaces.navigate).mockImplementation(async (label) => {
    if (label === 'surface-first') {
      throw new Error('first monitor failed')
    }
    started.resolve()
    await navigation.promise
  })
  const runtime = createWallpaperRuntime(surfaces)
  const first = website('https://example.com')
  const second = {...first, monitorId: 'second'}
  const rejected = expect(
    runtime.synchronize({connectedIds: ['first', 'second'], settings: [first, second]}),
  ).rejects.toThrow('first monitor failed')
  await started.promise
  const removed = runtime.synchronize({connectedIds: [], settings: []})
  expect(surfaces.close).not.toHaveBeenCalled()
  navigation.resolve()
  await rejected
  await removed
  expect(surfaces.close).toHaveBeenCalledWith('second', 'surface-second')
})

it('should reload changed website code once while retaining monitor interaction', async () => {
  const runtime = createWallpaperRuntime(surfaces)
  const initial = website('https://example.com')
  await runtime.synchronize({connectedIds: ['first'], settings: [initial]})
  const customized: MonitorWallpaper = {
    ...initial,
    content: {
      css: 'body { opacity: .5; }',
      mode: 'website',
      script: 'document.title = "custom"',
      url: 'https://example.com',
    },
  }
  await runtime.synchronize({connectedIds: ['first'], settings: [customized]})
  await runtime.synchronize({connectedIds: ['first'], settings: [customized]})
  expect(surfaces.navigate).toHaveBeenCalledTimes(2)
  expect(surfaces.navigate).toHaveBeenLastCalledWith('surface-first', 'https://example.com')
  expect(surfaces.open).toHaveBeenLastCalledWith('first', {
    css: 'body { opacity: .5; }',
    script: 'document.title = "custom"',
    scriptDom: undefined,
    scriptStart: undefined,
  })
  expect(surfaces.close).toHaveBeenCalledExactlyOnceWith('first', 'surface-first')
  expect(surfaces.setSurface).toHaveBeenCalledTimes(2)
  await runtime.synchronize({connectedIds: ['first'], settings: [initial]})
  expect(surfaces.navigate).toHaveBeenCalledTimes(3)
})

it.each(['scriptStart', 'scriptDom'] as const)(
  'should recreate the window when only %s changes and retain interactive input',
  async (field) => {
    const runtime = createWallpaperRuntime(surfaces)
    const initial = {
      ...website('https://example.com'),
      interaction: {activation: 'always' as const},
    }
    await runtime.synchronize({connectedIds: ['first'], settings: [initial]})
    await runtime.synchronize({
      connectedIds: ['first'],
      settings: [
        {
          ...initial,
          content: {[field]: 'window.changed = true', mode: 'website', url: 'https://example.com'},
        },
      ],
    })
    expect(surfaces.open).toHaveBeenCalledTimes(2)
    expect(surfaces.open).toHaveBeenLastCalledWith(
      'first',
      expect.objectContaining({[field]: 'window.changed = true'}),
    )
    expect(surfaces.setSurface).toHaveBeenLastCalledWith('surface-first', 'interactive')
  },
)
