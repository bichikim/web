import {cleanup, render, screen, waitFor, within} from '@solidjs/testing-library'
import Dexie from 'dexie'
import {Show} from 'solid-js'
import {afterEach, beforeEach, expect, it} from 'vitest'
import {userEvent} from 'vitest/browser'
import {SAlbumSettings} from '../../src/components/SAlbumSettings'
import {useWallpaper, type WallpaperController} from '../../src/features/settings'
import {createBuiltinMedia} from '../../src/features/builtin-assets'
import {createSettingsRepository} from '@winter-love/wallpaper/settings/repository'
import 'virtual:uno.css'

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
  await clearStorage()
})

const renderAlbum = async () => {
  let controller: WallpaperController | undefined
  render(() => {
    controller = useWallpaper()
    return (
      <div class="grid w-80 gap-3 p-4">
        <Show when={controller.current()}>
          <SAlbumSettings controller={controller} />
        </Show>
      </div>
    )
  })
  await waitFor(() => expect(controller?.items()).toHaveLength(12))
  await waitFor(() => expect(controller?.selectedId()).toBe('browser-preview'))
  return controller!
}

it.each(['photo', 'video'] as const)(
  'should cancel and confirm %s deletion without deleting the original file',
  async (kind) => {
    const controller = await renderAlbum()
    const file = new File(['original'], `mine.${kind === 'photo' ? 'png' : 'mp4'}`, {
      type: kind === 'photo' ? 'image/png' : 'video/mp4',
    })
    await controller.addMedia([file])
    const item = controller.items().find((entry) => entry.name === file.name)!
    const trigger = screen.getByRole('button', {name: `${file.name} 삭제`})
    trigger.focus()
    await userEvent.keyboard('{Enter}')
    const dialog = screen.getByRole('dialog', {name: '앨범에서 삭제'})
    expect(dialog.matches(':modal')).toBe(true)
    await userEvent.click(within(dialog).getByRole('button', {name: '취소'}))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(trigger)
    expect(controller.items()).toContainEqual(expect.objectContaining({id: item.id}))
    await userEvent.click(trigger)
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', {name: '삭제'}))
    await waitFor(() =>
      expect(controller.items().some((entry) => entry.id === item.id)).toBe(false),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const media = createBuiltinMedia('wallpaper-media')
    const settings = createSettingsRepository('wallpaper-settings')
    try {
      await expect(media.load(item.id)).rejects.toThrow('missing')
      expect((await settings.read())[0]?.content).toMatchObject({mediaIds: []})
      expect(await file.text()).toBe('original')
    } finally {
      media.close()
      settings.close()
    }
  },
)

it('should persist hiding and restore bundled photos without adding a character video', async () => {
  let controller = await renderAlbum()
  const item = controller.items()[0]!
  await controller.toggleMedia(item.id)
  await userEvent.click(screen.getByRole('button', {name: `${item.name} 숨기기`}))
  await waitFor(() => expect(controller.items()).toHaveLength(11))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(controller.current()?.content).toMatchObject({mediaIds: []})
  cleanup()
  // A fresh controller opens the persisted library, as when settings are reopened.
  let reopened: WallpaperController | undefined
  render(() => {
    reopened = useWallpaper()
    return (
      <Show when={reopened.current()}>
        <SAlbumSettings controller={reopened} />
      </Show>
    )
  })
  await waitFor(() => expect(reopened?.items()).toHaveLength(11))
  controller = reopened!
  expect(controller.items().some((entry) => entry.id === item.id)).toBe(false)
  await userEvent.click(screen.getByRole('button', {name: '기본 배경 복원'}))
  await waitFor(() => expect(controller.items()).toHaveLength(12))
  expect(controller.items().every((entry) => entry.kind === 'photo')).toBe(true)
  expect(screen.queryByRole('button', {name: '기본 배경 복원'})).not.toBeInTheDocument()
})
