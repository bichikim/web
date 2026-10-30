import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import Dexie from 'dexie'
import {afterEach, expect, it} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import {createWebRepository} from '@winter-love/wallpaper/web-repository'
import {createSettingsRepository} from '@winter-love/wallpaper/settings/repository'
import {createMonitorWallpaper} from '@winter-love/wallpaper/settings/model'
import {addAlbumFiles} from '../../src/features/settings/add-album-files'
import {SAlbumFolderImport} from '../../src/components/SAlbumFolderImport'
import 'virtual:uno.css'

afterEach(cleanup)

const photo = (path: string) => {
  const file = new File([path], path.split('/').at(-1)!, {type: 'image/png'})
  Object.defineProperty(file, 'webkitRelativePath', {value: path})
  return file
}

it.each([
  {depth: 0, names: ['root.png'], width: 320},
  {depth: 1, names: ['root.png', 'sub.png'], width: 560},
  {depth: null, names: ['root.png', 'sub.png', 'deep.png'], width: 900},
])(
  'should persist the folder photos at depth $depth alongside an existing album',
  async ({depth, names, width}) => {
    await page.viewport(width, 700)
    const mediaName = `folder-media-${crypto.randomUUID()}`
    const settingsName = `folder-settings-${crypto.randomUUID()}`
    const media = createWebRepository({databaseName: mediaName})
    const settings = createSettingsRepository(settingsName)
    try {
      const previous = createMonitorWallpaper('monitor')
      await settings.save(previous)
      await addAlbumFiles({
        files: [new File(['old'], 'old.png', {type: 'image/png'})],
        media,
        monitorId: 'monitor',
        settings,
      })
      const imported = Promise.withResolvers<void>()
      const handleFiles = (files: readonly File[]) => {
        const operation = addAlbumFiles({files, media, monitorId: 'monitor', settings})
        operation.then(imported.resolve, imported.reject)
        return operation
      }
      render(() => (
        <div class="w-70 overflow-hidden">
          <SAlbumFolderImport onFiles={handleFiles} />
        </div>
      ))
      const trigger = screen.getByRole('button', {name: '사진 폴더 추가'})
      fireEvent.click(trigger)
      const dialog = screen.getByRole('dialog', {name: '사진 폴더 추가'})
      expect(dialog.matches(':modal')).toBe(true)
      if (depth !== null) {
        fireEvent.click(screen.getByRole('checkbox', {name: '하위 폴더 모두 포함'}))
        const maximum = screen.getByRole('spinbutton', {name: '최대 깊이'})
        fireEvent.input(maximum, {target: {value: String(depth)}})
        fireEvent.blur(maximum)
      }
      const picker = screen.getByRole('button', {name: '폴더 선택'})
      const bounds = picker.getBoundingClientRect()
      expect(
        picker.contains(
          document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2),
        ),
      ).toBe(true)
      expect(dialog.scrollWidth).toBeLessThanOrEqual(dialog.clientWidth)
      fireEvent.change(dialog.querySelector('input[type=file]')!, {
        target: {
          files: [
            photo('album/root.png'),
            photo('album/sub/sub.png'),
            photo('album/sub/deep/deep.png'),
            new File(['text'], 'note.txt', {type: 'text/plain'}),
          ],
        },
      })
      await imported.promise
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(document.activeElement).toBe(trigger)
      media.close()
      settings.close()
      const reopenedMedia = createWebRepository({databaseName: mediaName})
      const reopenedSettings = createSettingsRepository(settingsName)
      try {
        const stored = await reopenedMedia.read()
        const [monitor] = await reopenedSettings.read()
        expect(stored.items.map((item) => item.name)).toEqual(['old.png', ...names])
        expect(monitor?.content).toMatchObject({
          mediaIds: stored.items.map((item) => item.id),
          mode: 'album',
        })
      } finally {
        reopenedMedia.close()
        reopenedSettings.close()
      }
    } finally {
      media.close()
      settings.close()
      await Dexie.delete(mediaName)
      await Dexie.delete(settingsName)
    }
  },
)

it('should select an already stored folder photo in the current album without duplicating its media', async () => {
  const mediaName = `folder-media-${crypto.randomUUID()}`
  const settingsName = `folder-settings-${crypto.randomUUID()}`
  const media = createWebRepository({databaseName: mediaName})
  const settings = createSettingsRepository(settingsName)
  try {
    const file = photo('album/root.png')
    await media.add(file, 'photo')
    const initial = await media.read()
    await settings.save(createMonitorWallpaper('monitor'))
    const imported = Promise.withResolvers<void>()
    render(() => (
      <SAlbumFolderImport
        onFiles={(files) => {
          const operation = addAlbumFiles({files, media, monitorId: 'monitor', settings})
          operation.then(imported.resolve, imported.reject)
          return operation
        }}
      />
    ))
    fireEvent.click(screen.getByRole('button', {name: '사진 폴더 추가'}))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(dialog.querySelector('input[type=file]')!, {target: {files: [file]}})
    await imported.promise
    expect((await media.read()).items).toHaveLength(1)
    expect((await settings.read())[0]?.content).toMatchObject({mediaIds: [initial.items[0]!.id]})
  } finally {
    media.close()
    settings.close()
    await Dexie.delete(mediaName)
    await Dexie.delete(settingsName)
  }
})

it.for([20, 200])(
  'should keep the UI responsive while importing %i small photos',
  async (count, context) => {
    const mediaName = `folder-media-${crypto.randomUUID()}`
    const settingsName = `folder-settings-${crypto.randomUUID()}`
    const media = createWebRepository({databaseName: mediaName})
    const settings = createSettingsRepository(settingsName)
    const files = Array.from({length: count}, (_, index) => {
      const file = new File([new Uint8Array(65_536), String(index)], `${index}.png`, {
        type: 'image/png',
      })
      Object.defineProperty(file, 'webkitRelativePath', {value: `album/${index}.png`})
      return file
    })
    let frame = 0
    let lastFrame = Date.now()
    let largestGap = 0
    let frames = 0
    const inputChannel = new MessageChannel()
    const sample = () => {
      const now = Date.now()
      largestGap = Math.max(largestGap, now - lastFrame)
      lastFrame = now
      frames += 1
      frame = requestAnimationFrame(sample)
    }
    try {
      await settings.save(createMonitorWallpaper('monitor'))
      const imported = Promise.withResolvers<void>()
      let clicked = false
      let inputLatency = Number.POSITIVE_INFINITY
      let elapsed = 0
      let started = 0
      render(() => (
        <>
          <button
            type="button"
            onClick={() => {
              clicked = true
            }}
          >
            응답 확인
          </button>
          <SAlbumFolderImport
            onFiles={(selected) => {
              const operation = addAlbumFiles({
                files: selected,
                media,
                monitorId: 'monitor',
                settings,
              })
              operation.then(() => {
                elapsed = Date.now() - started
                cancelAnimationFrame(frame)
                imported.resolve()
              }, imported.reject)
              return operation
            }}
          />
        </>
      ))
      fireEvent.click(screen.getByRole('button', {name: '사진 폴더 추가'}))
      started = Date.now()
      lastFrame = started
      frame = requestAnimationFrame(sample)
      fireEvent.change(screen.getByRole('dialog').querySelector('input[type=file]')!, {
        target: {files},
      })
      const input = Promise.withResolvers<void>()
      const queuedAt = Date.now()
      inputChannel.port1.onmessage = () => {
        inputLatency = Date.now() - queuedAt
        fireEvent.click(screen.getByRole('button', {name: '응답 확인'}))
        input.resolve()
      }
      inputChannel.port2.postMessage(null)
      await input.promise
      await imported.promise
      await userEvent.click(screen.getByRole('button', {name: '응답 확인'}))
      cancelAnimationFrame(frame)
      await context.annotate(
        JSON.stringify({count, elapsed, frames, inputLatency, largestGap}),
        'performance',
      )
      expect(clicked).toBe(true)
      expect(inputLatency).toBeGreaterThanOrEqual(0)
      expect(inputLatency).toBeLessThan(1000)
      expect(elapsed).toBeLessThan(5000)
      expect(largestGap).toBeLessThan(500)
      expect(frames).toBeGreaterThan(0)
      expect((await media.read()).items).toHaveLength(count)
    } finally {
      cancelAnimationFrame(frame)
      inputChannel.port1.close()
      inputChannel.port2.close()
      media.close()
      settings.close()
      await Dexie.delete(mediaName)
      await Dexie.delete(settingsName)
    }
  },
)
