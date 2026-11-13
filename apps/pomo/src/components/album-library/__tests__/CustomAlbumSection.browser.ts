import '@unocss/reset/tailwind.css'
import {cleanup, render} from '@solidjs/testing-library'
import {createComponent, createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it} from 'vitest'
import {commands, page, userEvent} from 'vitest/browser'
import * as m from '@paraglide/message'
import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import {deleteCustomAlbum, readCustomAlbums, saveCustomAlbum} from 'src/features/custom-albums'
import {CustomAlbumSection} from '../CustomAlbumSection'
import {holdAlbumWrites} from './support/hold-album-writes'

declare module 'vitest/browser' {
  interface BrowserCommands {
    getUtilityStyles: (content: string) => Promise<string>
    setReducedMotion: (reducedMotion: 'reduce' | 'no-preference') => Promise<void>
  }
}

const originalGetLocale = getLocale
const titlePrefix = `album-editor-regression:${crypto.randomUUID()}`
const firstTitle = `${titlePrefix} A`
const secondTitle = `${titlePrefix} B`
let stylesheet: HTMLStyleElement | undefined
let releaseWrites: (() => Promise<void>) | undefined

beforeEach(async () => {
  overwriteGetLocale(() => 'en')
  await commands.setReducedMotion('reduce')
})

afterEach(async () => {
  await releaseWrites?.()
  releaseWrites = undefined
  cleanup()
  stylesheet?.remove()
  stylesheet = undefined
  const albums = await readCustomAlbums()
  await Promise.all(
    albums
      .filter((album) => album.title.startsWith(titlePrefix))
      .map((album) => deleteCustomAlbum(album.id)),
  )
  overwriteGetLocale(originalGetLocale)
  await commands.setReducedMotion('no-preference')
})

const mountSection = async () => {
  await Promise.all(
    [firstTitle, secondTitle].map((title) =>
      saveCustomAlbum({
        albumId: null,
        artist: '',
        coverIcon: 'disc',
        coverImage: {kind: 'keep'},
        coverSource: 'manual',
        title,
        tracks: [],
      }),
    ),
  )
  const initial = await readCustomAlbums()
  render(() => {
    const [albums, setAlbums] = createSignal(initial)
    return createComponent(CustomAlbumSection, {
      get albums() {
        return albums()
      },
      error: null,
      isLoading: false,
      onAddAlbum: () => undefined,
      onAddTrack: () => undefined,
      onDeleteAlbum: async () => undefined,
      onPreview: () => undefined,
      onRetry: () => undefined,
      onSaved: async () => {
        setAlbums(await readCustomAlbums())
      },
      pendingTrackId: null,
      playingTrackId: null,
      trackIds: new Set<string>(),
    })
  })
  stylesheet = document.createElement('style')
  stylesheet.textContent = await commands.getUtilityStyles(document.body.outerHTML)
  document.head.append(stylesheet)
  return initial
}

const albumName = () => page.getByRole('textbox', {exact: true, name: m.album_custom_name_label()})
const openFirst = async () => {
  await page
    .getByRole('article')
    .filter({has: page.getByRole('heading', {exact: true, name: firstTitle})})
    .getByRole('button', {exact: true, name: m.album_custom_edit()})
    .click()
  await expect.element(albumName()).toHaveValue(firstTitle)
  stylesheet!.textContent = await commands.getUtilityStyles(document.body.outerHTML)
}
const overlay = () => {
  const dialog = page.getByRole('dialog').element()
  const element = dialog.parentElement?.firstElementChild
  if (!(element instanceof HTMLElement)) {
    throw new Error('The actual PModal overlay is missing.')
  }
  return element
}

it('should keep saving open through overlay and Escape, then create a separate album', async () => {
  const initial = await mountSection()
  await openFirst()
  const editedTitle = `${titlePrefix} edited A`
  await albumName().fill(editedTitle)
  releaseWrites = await holdAlbumWrites()
  await page.getByRole('button', {exact: true, name: m.album_custom_save()}).click()
  await expect
    .element(page.getByRole('button', {exact: true, name: m.album_custom_saving()}))
    .toBeDisabled()
  await expect
    .element(page.getByRole('button', {exact: true, name: m.album_custom_cancel()}))
    .toBeDisabled()
  await expect
    .element(page.getByRole('button', {exact: true, name: m.common_close()}))
    .not.toBeInTheDocument()
  await userEvent.keyboard('{Escape}')
  await expect.element(page.getByRole('dialog')).toBeVisible()
  await userEvent.click(overlay(), {position: {x: 1, y: 1}})
  await expect.element(page.getByRole('dialog')).toBeVisible()
  await expect.element(albumName()).toHaveValue(editedTitle)
  await userEvent.keyboard('{Tab}')
  expect(page.getByRole('dialog').element().contains(document.activeElement)).toBe(true)
  await releaseWrites()
  releaseWrites = undefined
  await expect.element(page.getByRole('dialog')).not.toBeInTheDocument()

  await page.getByRole('button', {exact: true, name: m.album_custom_create()}).click()
  await expect.element(albumName()).toHaveValue('')
  const newTitle = `${titlePrefix} new album`
  await albumName().fill(newTitle)
  await page.getByRole('button', {exact: true, name: m.album_custom_save()}).click()
  await expect.element(page.getByRole('dialog')).not.toBeInTheDocument()
  const stored = await readCustomAlbums()
  expect(stored).toHaveLength(initial.length + 1)
  const original = initial.find((album) => album.title === firstTitle)!
  expect(stored.find((album) => album.id === original.id)?.title).toBe(editedTitle)
  const created = stored.filter((album) => !initial.some((original) => original.id === album.id))
  expect(created).toHaveLength(1)
  expect(created[0]).toMatchObject({title: newTitle})
  const other = initial.find((album) => album.title === secondTitle)!
  expect(stored.find((album) => album.id === other.id)).toEqual(other)
})

it.each(['Escape', 'Cancel'] as const)(
  'should remount a blank create editor after %s discards an edit',
  async (method) => {
    const initial = await mountSection()
    await openFirst()
    await albumName().fill(`${titlePrefix} discarded`)
    if (method === 'Escape') {
      await userEvent.keyboard('{Escape}')
    } else {
      await page.getByRole('button', {exact: true, name: m.album_custom_cancel()}).click()
    }
    await expect.element(page.getByRole('dialog')).not.toBeInTheDocument()
    await page.getByRole('button', {exact: true, name: m.album_custom_create()}).click()
    await expect
      .element(page.getByRole('dialog'))
      .toHaveAccessibleName(m.album_custom_create_title())
    await expect.element(albumName()).toHaveValue('')
    await userEvent.keyboard('{Escape}')
    expect(await readCustomAlbums()).toEqual(initial)
  },
)
