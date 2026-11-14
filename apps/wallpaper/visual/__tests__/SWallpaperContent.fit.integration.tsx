import {cleanup, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal, Show} from 'solid-js'
import Dexie from 'dexie'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import * as playerModule from '@winter-love/puppet/player'
import {createSettingsRepository} from '@winter-love/wallpaper/settings/repository'
import {useWallpaper, type WallpaperController} from '../../src/features/settings'
import {SBackground} from '../../src/components/SBackground'
import {SWallpaperContent} from '../../src/components/SWallpaperContent'
import 'virtual:uno.css'

vi.mock('@winter-love/puppet/player', async (importOriginal) => {
  const original = await importOriginal<typeof playerModule>()
  return {...original, createPlayer: vi.fn(original.createPlayer)}
})

const clearStorage = async () => {
  await Promise.all([
    Dexie.delete('wallpaper-media'),
    Dexie.delete('wallpaper-media-builtin'),
    Dexie.delete('wallpaper-settings'),
  ])
}
beforeEach(clearStorage)
afterEach(async () => {
  cleanup()
  vi.clearAllMocks()
  await clearStorage()
})

const source = () =>
  JSON.stringify({
    ...playerModule.createEmptyDocument(),
    parts: [
      {
        id: 'scene',
        mesh: {
          indices: [0, 1, 2, 0, 2, 3],
          uvs: [0, 0, 1, 0, 1, 1, 0, 1],
          vertices: [0, 0, 400, 0, 400, 200, 0, 200],
        },
        texture: {
          height: 200,
          src: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><path fill="red" d="M0 0h400v200H0z"/><path fill="blue" d="M180 80h40v40h-40z"/></svg>')}`,
          width: 400,
        },
      },
    ],
    scene: {roots: [{id: 'scene', kind: 'part', locked: false, name: 'Scene', visible: true}]},
    viewport: {height: 200, width: 400},
  })

const pixels = (canvas: HTMLCanvasElement, player: playerModule.Player) => {
  const copy = document.createElement('canvas')
  copy.width = canvas.width
  copy.height = canvas.height
  const context = copy.getContext('2d')!
  player.redraw()
  context.drawImage(canvas, 0, 0)
  const {data, height, width} = context.getImageData(0, 0, copy.width, copy.height)
  const color = (x: number, y: number) => data.slice((y * width + x) * 4, (y * width + x) * 4 + 4)
  const blue = (x: number, y: number) => color(x, y)[2]! > 200 && color(x, y)[0]! < 30
  return {
    corners: [color(1, 1)[3], color(width - 2, height - 2)[3]],
    squareHeight: Array.from({length: height}, (_, y) => blue(Math.floor(width / 2), y)).filter(
      Boolean,
    ).length,
    squareWidth: Array.from({length: width}, (_, x) => blue(x, Math.floor(height / 2))).filter(
      Boolean,
    ).length,
  }
}

test('should persist uniform cover sizing across preview, wallpaper and resize', async () => {
  let controller: WallpaperController | undefined
  const [portrait, setPortrait] = createSignal(false)
  render(() => {
    controller = useWallpaper()
    return (
      <div class="flex items-start gap-4">
        <div class="w-100 shrink-0">
          <Show when={controller.current()}>
            <SWallpaperContent controller={controller} />
          </Show>
        </div>
        <div
          class="relative shrink-0 [transform:translate(0)]"
          classList={{'h-60 w-80': !portrait(), 'h-80 w-60': portrait()}}
        >
          <SBackground monitorId="browser-preview" />
        </div>
      </div>
    )
  })
  await waitFor(() => expect(controller?.selectedId()).toBe('browser-preview'))
  expect(playerModule.parseDocument(source())).toMatchObject({ok: true})
  await controller!.addPuppet(new File([source()], 'scene.poffo.json'))
  expect(controller!.error()).toBeNull()
  await expect.poll(() => vi.mocked(playerModule.createPlayer).mock.calls.length).toBe(2)
  const rendered = await Promise.all(
    vi.mocked(playerModule.createPlayer).mock.calls.map(async ([options], index) => ({
      canvas: options.canvas,
      player: await vi.mocked(playerModule.createPlayer).mock.results[index]!.value,
    })),
  )
  for (const entry of rendered) {
    expect(pixels(entry.canvas, entry.player).corners).toEqual([0, 0])
  }
  await userEvent.click(screen.getByRole('combobox', {name: 'Poffo 표시 방식'}))
  await userEvent.click(screen.getByRole('option', {name: '화면 채우기'}))
  const repository = createSettingsRepository('wallpaper-settings')
  try {
    await expect
      .poll(async () => (await repository.read())[0]?.content)
      .toMatchObject({
        fit: 'cover',
        mode: 'puppet',
      })
    await Promise.all(
      rendered.map(async (entry) => {
        await expect.poll(() => pixels(entry.canvas, entry.player).corners).toEqual([255, 255])
        const image = pixels(entry.canvas, entry.player)
        expect(image.squareWidth).toBeGreaterThan(0)
        expect(Math.abs(image.squareWidth - image.squareHeight)).toBeLessThanOrEqual(1)
      }),
    )
    const background = screen.getByRole('main', {name: 'Wallpaper 배경'})
    const runtime = rendered.find((entry) => background.contains(entry.canvas))!
    setPortrait(true)
    await expect.poll(() => runtime.canvas.clientHeight).toBe(320)
    await expect.poll(() => pixels(runtime.canvas, runtime.player).corners).toEqual([255, 255])
    const image = pixels(runtime.canvas, runtime.player)
    expect(Math.abs(image.squareWidth - image.squareHeight)).toBeLessThanOrEqual(1)
    await userEvent.click(screen.getByRole('combobox', {name: 'Poffo 표시 방식'}))
    await userEvent.click(screen.getByRole('option', {name: '전체 보기'}))
    await Promise.all(
      rendered.map((entry) =>
        expect.poll(() => pixels(entry.canvas, entry.player).corners).toEqual([0, 0]),
      ),
    )
    expect(playerModule.createPlayer).toHaveBeenCalledTimes(2)
    expect(controller!.error()).toBeNull()
    await userEvent.click(screen.getByRole('combobox', {name: 'Poffo 표시 방식'}))
    await userEvent.click(screen.getByRole('option', {name: '화면 채우기'}))
    await expect
      .poll(async () => (await repository.read())[0]?.content)
      .toMatchObject({fit: 'cover'})
    cleanup()
    render(() => (
      <div class="relative h-80 w-60 [transform:translate(0)]">
        <SBackground monitorId="browser-preview" />
      </div>
    ))
    await expect.poll(() => vi.mocked(playerModule.createPlayer).mock.calls.length).toBe(3)
    const options = vi.mocked(playerModule.createPlayer).mock.calls[2]![0]
    const restored = await vi.mocked(playerModule.createPlayer).mock.results[2]!.value
    expect(options.fit).toBe('cover')
    await expect.poll(() => pixels(options.canvas, restored).corners).toEqual([255, 255])
  } finally {
    repository.close()
  }
})
