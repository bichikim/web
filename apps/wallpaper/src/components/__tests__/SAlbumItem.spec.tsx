/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import type {WallpaperController} from '../../features/settings'
import type {BackgroundMedia} from '@winter-love/wallpaper/model'
import {SAlbumItem} from '../SAlbumItem'

const ITEM: BackgroundMedia = {id: 'photo', kind: 'photo', name: 'Photo', size: 1}

const createController = (): WallpaperController => ({
  addMedia: vi.fn(async () => undefined),
  addPuppet: vi.fn(async () => undefined),
  busy: () => false,
  changeMode: vi.fn(async () => undefined),
  current: () => null,
  dismissError: vi.fn(),
  error: () => null,
  hasHiddenMedia: () => false,
  items: () => [],
  loadMedia: vi.fn(async () => new Blob()),
  loadPuppet: vi.fn(async () => ''),
  monitors: () => [],
  puppets: () => [],
  removeMedia: vi.fn(async () => undefined),
  restoreBuiltinMedia: vi.fn(async () => undefined),
  selectedId: () => null,
  selectMonitor: vi.fn(),
  setContent: vi.fn(async () => undefined),
  setInteraction: vi.fn(async () => undefined),
  toggleMedia: vi.fn(async () => undefined),
  wallpapers: () => [],
})

beforeEach(() => {
  vi.stubGlobal('URL', {createObjectURL: vi.fn(() => 'blob:photo'), revokeObjectURL: vi.fn()})
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('should keep the checkbox consistent with the album when a toggle is not committed', () => {
  const controller = createController()
  render(() => <SAlbumItem item={ITEM} controller={controller} selected />)
  const checkbox = screen.getByRole('checkbox', {name: ITEM.name})
  fireEvent.click(checkbox)
  expect(checkbox).toBeChecked()
  fireEvent.click(checkbox)
  expect(controller.toggleMedia).toHaveBeenCalledTimes(2)
})

it('should follow a committed album selection and announce preview focus', () => {
  const [selected, setSelected] = createSignal(true)
  const controller = createController()
  const onPreview = vi.fn()
  vi.mocked(controller.toggleMedia).mockImplementation(async () => {
    setSelected(false)
  })
  render(() => (
    <SAlbumItem item={ITEM} controller={controller} selected={selected()} onPreview={onPreview} />
  ))
  const checkbox = screen.getByRole('checkbox', {name: ITEM.name})
  fireEvent.focus(checkbox)
  expect(onPreview).toHaveBeenCalledWith(ITEM.id)
  fireEvent.click(checkbox)
  expect(checkbox).not.toBeChecked()
})

it.each(['photo', 'video'] as const)(
  'should request %s deletion without changing the album selection',
  (kind) => {
    const controller = createController()
    const onRemove = vi.fn()
    render(() => (
      <SAlbumItem item={{...ITEM, kind}} controller={controller} selected onRemove={onRemove} />
    ))
    fireEvent.click(screen.getByRole('button', {name: 'Photo 삭제'}))
    expect(onRemove).toHaveBeenCalledOnce()
    expect(controller.toggleMedia).not.toHaveBeenCalled()
    expect(screen.getByRole('checkbox', {name: 'Photo'})).toBeChecked()
  },
)

it('should offer hiding instead of deletion for a bundled wallpaper', () => {
  render(() => (
    <SAlbumItem
      item={{...ITEM, id: 'builtin:cover:window'}}
      controller={createController()}
      selected
      onRemove={vi.fn()}
    />
  ))
  expect(screen.getByRole('button', {name: 'Photo 숨기기'})).toBeDefined()
})
