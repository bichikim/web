/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import {cleanup, fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {
  type AlbumWallpaper,
  createMonitorWallpaper,
  type WallpaperContent,
} from '@winter-love/wallpaper/settings/model'
import type {WallpaperController} from '../../features/settings'
import {createSignal} from 'solid-js'
import {SWallpaperContent} from '../SWallpaperContent'

vi.mock('../../features/background/use-puppet', () => ({usePuppet: vi.fn()}))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it.each(['hover', 'focus'])(
  'should preview an unchecked video on %s without selecting it',
  async (action) => {
    vi.stubGlobal('URL', {createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn()})
    const defaults = createMonitorWallpaper('monitor')
    const album = defaults.content
    if (album.mode !== 'album') {
      throw new Error('Expected album')
    }
    const controller: WallpaperController = {
      addMedia: vi.fn(async () => undefined),
      addPuppet: vi.fn(async () => undefined),
      busy: () => false,
      changeMode: vi.fn(async () => undefined),
      current: () => ({...defaults, content: {...album, mediaIds: ['photo']}}),
      dismissError: vi.fn(),
      error: () => null,
      hasHiddenMedia: () => false,
      items: () => [
        {id: 'photo', kind: 'photo', name: 'Photo', size: 1},
        {id: 'video', kind: 'video', name: 'Video', size: 1},
      ],
      loadMedia: vi.fn(async () => new Blob()),
      loadPuppet: vi.fn(async () => ''),
      monitors: () => [],
      puppets: () => [],
      removeMedia: vi.fn(async () => undefined),
      restoreBuiltinMedia: vi.fn(async () => undefined),
      selectedId: () => 'monitor',
      selectMonitor: vi.fn(),
      setContent: vi.fn(async () => undefined),
      setInteraction: vi.fn(async () => undefined),
      toggleMedia: vi.fn(async () => undefined),
      wallpapers: () => [],
    }
    render(() => <SWallpaperContent controller={controller} />)
    const checkbox = screen.getByRole('checkbox', {name: 'Video'})
    if (action === 'hover') {
      fireEvent.pointerEnter(checkbox.parentElement!)
    } else {
      fireEvent.focus(checkbox)
    }
    const preview = screen.getByRole('figure', {name: '배경 미리보기'})
    await waitFor(() =>
      expect(preview.querySelector('video')).toHaveAttribute('aria-label', 'Video'),
    )
    expect(checkbox).not.toBeChecked()
    expect(controller.toggleMedia).not.toHaveBeenCalled()
  },
)

it('should adjust camera and face in the main background preview without adding another canvas', () => {
  const defaults = createMonitorWallpaper('monitor')
  const setContent = vi.fn(async (content: WallpaperContent) => {
    void content
  })
  const controller: WallpaperController = {
    addMedia: vi.fn(async () => undefined),
    addPuppet: vi.fn(async () => undefined),
    busy: () => false,
    changeMode: vi.fn(async () => undefined),
    current: () => ({
      ...defaults,
      content: {
        assetId: 'character',
        mode: 'puppet',
        placement: {scale: 0.8, x: 0.7, y: 0.4},
        tracking: 'camera',
        trackingOptions: {cameraX: -0.2, faceY: 0.3, headScale: 1.5},
      },
    }),
    dismissError: vi.fn(),
    error: () => null,
    hasHiddenMedia: () => false,
    items: () => [],
    loadMedia: vi.fn(),
    loadPuppet: vi.fn(async () => ''),
    monitors: () => [{height: 1080, id: 'monitor', name: 'Monitor', width: 1920}],
    puppets: () => [],
    removeMedia: vi.fn(async () => undefined),
    restoreBuiltinMedia: vi.fn(async () => undefined),
    selectedId: () => 'monitor',
    selectMonitor: vi.fn(),
    setContent,
    setInteraction: vi.fn(async () => undefined),
    toggleMedia: vi.fn(async () => undefined),
    wallpapers: () => [],
  }
  render(() => <SWallpaperContent controller={controller} />)
  const preview = screen.getByRole('figure', {name: '배경 미리보기'})
  const loader = screen.getByRole('region', {name: 'Poffo 불러오기'})
  const editor = screen.getByRole('region', {name: 'Poffo 배경 조정'})
  expect(loader.contains(preview)).toBe(false)
  expect(editor.contains(preview)).toBe(true)
  expect(within(loader).getByRole('button', {name: 'Poffo 불러오기'})).toBeDefined()
  expect(screen.queryByRole('button', {name: 'Poffo 파일 가져오기'})).toBeNull()
  expect(within(editor).queryByRole('button', {name: 'Poffo 파일 가져오기'})).toBeNull()
  expect(loader.compareDocumentPosition(editor)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)

  expect(screen.getByRole('region', {name: '시선 보정 설정'})).toBeDefined()
  expect(within(preview).queryByRole('button', {name: '카메라 위치 조정'})).toBeNull()
  fireEvent.click(within(preview).getByRole('button', {name: '위치 핸들 표시'}))
  const camera = within(preview).getByRole('button', {name: '카메라 위치 조정'})
  const face = within(preview).getByRole('button', {name: '얼굴 기준 조정'})
  expect(document.querySelectorAll('canvas')).toHaveLength(1)
  fireEvent.keyDown(camera, {key: 'ArrowRight'})
  expect(setContent.mock.lastCall?.[0]).toMatchObject({
    placement: {scale: 0.8, x: 0.7, y: 0.4},
    trackingOptions: {cameraX: -0.19, faceY: 0.3, headScale: 1.5},
  })
  fireEvent.keyDown(face, {key: 'ArrowDown'})
  expect(setContent.mock.lastCall?.[0]).toMatchObject({
    placement: {scale: 0.8, x: 0.7, y: 0.4},
    trackingOptions: {cameraX: -0.2, faceY: 0.31, headScale: 1.5},
  })
})

it.each(['photo', 'video'] as const)(
  'should switch %s preview sizing with the persisted album setting',
  async (kind) => {
    vi.stubGlobal('URL', {createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn()})
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
    Object.defineProperty(HTMLElement.prototype, 'showPopover', {
      configurable: true,
      value: vi.fn(),
    })
    const defaults = createMonitorWallpaper('monitor')
    const [album, setAlbum] = createSignal<AlbumWallpaper>({
      mediaIds: ['media'],
      mode: 'album',
      order: 'sequential',
      photoSeconds: 10,
      transition: 'fade',
      videoMode: 'end',
    })
    const controller: WallpaperController = {
      addMedia: vi.fn(async () => undefined),
      addPuppet: vi.fn(async () => undefined),
      busy: () => false,
      changeMode: vi.fn(async () => undefined),
      current: () => ({...defaults, content: album()}),
      dismissError: vi.fn(),
      error: () => null,
      hasHiddenMedia: () => false,
      items: () => [{id: 'media', kind, name: 'Media', size: 1}],
      loadMedia: vi.fn(async () => new Blob()),
      loadPuppet: vi.fn(),
      monitors: () => [],
      puppets: () => [],
      removeMedia: vi.fn(async () => undefined),
      restoreBuiltinMedia: vi.fn(async () => undefined),
      selectedId: () => 'monitor',
      selectMonitor: vi.fn(),
      setContent: vi.fn(async (next) => {
        if (next.mode === 'album') {
          setAlbum(next)
        }
      }),
      setInteraction: vi.fn(async () => undefined),
      toggleMedia: vi.fn(async () => undefined),
      wallpapers: () => [],
    }
    try {
      render(() => <SWallpaperContent controller={controller} />)
      const preview = screen.getByRole('figure', {name: '배경 미리보기'})
      await waitFor(() =>
        expect(preview.querySelector(kind === 'photo' ? 'img' : 'video')).not.toBeNull(),
      )
      const media = preview.querySelector(kind === 'photo' ? 'img' : 'video')!
      expect(media).toHaveClass('object-contain')
      const sizing = screen.getByRole('combobox', {name: '사진·동영상 표시 방식'})
      fireEvent.click(sizing)
      fireEvent.click(screen.getByRole('option', {name: '화면 채우기'}))
      expect(controller.setContent).toHaveBeenCalledWith(expect.objectContaining({fit: 'cover'}))
      expect(media).toHaveClass('object-cover')
      expect(media).not.toHaveClass('object-contain')
      fireEvent.click(sizing)
      fireEvent.click(screen.getByRole('option', {name: '전체 보기'}))
      expect(media).toHaveClass('object-contain')
    } finally {
      cleanup()
      if (original === undefined) {
        Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
      } else {
        Object.defineProperty(HTMLElement.prototype, 'showPopover', original)
      }
    }
  },
)
