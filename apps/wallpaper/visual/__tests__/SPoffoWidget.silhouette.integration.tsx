import {cleanup, render, screen} from '@solidjs/testing-library'
import * as player from '@winter-love/puppet/player'
import {createLibraryRepository} from '@winter-love/wallpaper/settings/library-repository'
import {createSettingsRepository} from '@winter-love/wallpaper/settings/repository'
import {afterEach, expect, test, vi} from 'vitest'
import {SPoffoWidget} from '../../src/components/SPoffoWidget'
import 'virtual:uno.css'

vi.mock('@tauri-apps/api/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tauri-apps/api/core')>()),
  invoke: vi.fn().mockResolvedValue(undefined),
  isTauri: () => true,
}))
vi.mock('@tauri-apps/api/event', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tauri-apps/api/event')>()),
  emitTo: vi.fn().mockResolvedValue(undefined),
  listen: vi.fn().mockResolvedValue(vi.fn()),
}))
vi.mock('@tauri-apps/api/webview', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tauri-apps/api/webview')>()),
  getCurrentWebview: () => ({listen: async () => vi.fn()}),
}))
vi.mock('@tauri-apps/api/window', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tauri-apps/api/window')>()),
  getCurrentWindow: () => ({label: 'silhouette-test', onMoved: async () => vi.fn()}),
}))
vi.mock('@winter-love/puppet/player', async (importOriginal) => {
  const actual = await importOriginal<typeof player>()
  return {...actual, preparePuppetDocument: vi.fn(actual.preparePuppetDocument)}
})
afterEach(cleanup)

const loadingMask = () => {
  const status = screen.getByRole('status', {name: '캐릭터 불러오는 중'})
  const graphic = status.querySelector('[aria-hidden="true"]')!
  return getComputedStyle(graphic).maskImage
}

test('should save an imported character silhouette after rendering and reuse it on reopen', async () => {
  const library = createLibraryRepository('wallpaper-library')
  const settings = createSettingsRepository('wallpaper-settings')
  const model = player.createDemoDocument()
  const asset = await settings.addPuppet(
    'Imported silhouette fixture',
    JSON.stringify({
      ...model,
      motions: [],
      parts: model.parts.map((part, index) =>
        index === 0 ? {...part, properties: {...part.properties, opacity: 0.5}} : part,
      ),
    }),
  )
  const widget = await library.addWidget(asset.id)
  const actual = await vi.importActual<typeof player>('@winter-love/puppet/player')
  const first = Promise.withResolvers<void>()
  const second = Promise.withResolvers<void>()
  vi.mocked(player.preparePuppetDocument)
    .mockImplementationOnce(async (options) => {
      await first.promise
      return actual.preparePuppetDocument(options)
    })
    .mockImplementationOnce(async (options) => {
      await second.promise
      return actual.preparePuppetDocument(options)
    })
  let view = render(() => <SPoffoWidget id={widget.id} />)
  try {
    await expect.poll(() => player.preparePuppetDocument).toHaveBeenCalledTimes(1)
    expect(loadingMask()).toBe('none')
    expect(await settings.loadPuppetSilhouette(asset.id)).toBeUndefined()
    first.resolve()
    await expect
      .poll(() => screen.getByLabelText('Poffo 배경').getAttribute('aria-hidden'))
      .toBe('false')
    await expect
      .poll(async () => (await settings.loadPuppetSilhouette(asset.id))?.type)
      .toBe('image/png')
    const image = await createImageBitmap((await settings.loadPuppetSilhouette(asset.id))!)
    try {
      const canvas = new OffscreenCanvas(image.width, image.height)
      const context = canvas.getContext('2d')!
      context.drawImage(image, 0, 0)
      const alpha = context
        .getImageData(0, 0, image.width, image.height)
        .data.filter((_, index) => index % 4 === 3)
      expect(alpha).toContain(255)
      expect(alpha).toContain(0)
      expect(alpha.some((value) => value > 0 && value < 255)).toBe(true)
    } finally {
      image.close()
    }
    view.unmount()
    view = render(() => <SPoffoWidget id={widget.id} />)
    await expect.poll(() => player.preparePuppetDocument).toHaveBeenCalledTimes(2)
    await expect.poll(loadingMask).toContain('blob:')
    expect(screen.getByLabelText('Poffo 배경').getAttribute('aria-hidden')).toBe('true')
    second.resolve()
    await expect
      .poll(() => screen.getByLabelText('Poffo 배경').getAttribute('aria-hidden'))
      .toBe('false')
    expect(screen.queryByRole('status', {name: '캐릭터 불러오는 중'})).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  } finally {
    view.unmount()
    first.resolve()
    second.resolve()
    await library.removeWidget(widget.id)
    library.close()
    await settings.removePuppet(asset.id)
    settings.close()
  }
})
