/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, within} from '@solidjs/testing-library'
import {afterAll, afterEach, beforeAll, expect, test, vi} from 'vitest'
import {createSignal} from 'solid-js'
import type {PoffoWidget} from '@winter-love/wallpaper/settings/library-model'
import type {WallpaperController} from '../../features/settings'
import type {WallpaperLibraryController} from '../../features/library'
import {usePuppet} from '../../features/background/use-puppet'
import {SPoffoWidgetSettings} from '../SPoffoWidgetSettings'

vi.mock('../../features/background/use-puppet', () => ({usePuppet: vi.fn()}))
vi.mock('../SPoffoTrackingBindings', () => ({SPoffoTrackingBindings: () => null}))
const originalPopover = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
beforeAll(() =>
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {
    configurable: true,
    value: vi.fn(),
  }),
)
afterAll(() => {
  if (originalPopover === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', originalPopover)
  }
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const renderWidgets = () => {
  const [widgets, setWidgets] = createSignal<readonly PoffoWidget[]>([
    {
      assetId: 'character',
      id: 'first',
      tracking: 'camera',
      trackingOptions: {faceY: 0.2},
      x: null,
      y: null,
    },
    {
      assetId: 'other',
      id: 'second',
      tracking: 'camera',
      trackingOptions: {faceY: 0.4},
      x: null,
      y: null,
    },
  ])
  const controller: WallpaperController = {
    addMedia: vi.fn(async () => undefined),
    addPuppet: vi.fn(async () => undefined),
    busy: () => false,
    changeMode: vi.fn(async () => undefined),
    current: () => null,
    dismissError: vi.fn(),
    error: () => null,
    hasHiddenMedia: () => false,
    items: () => [],
    loadMedia: vi.fn(),
    loadPuppet: vi.fn(),
    monitors: () => [],
    puppets: () => [
      {id: 'other', name: 'Other'},
      {id: 'character', name: 'Character'},
    ],
    removeMedia: vi.fn(async () => undefined),
    restoreBuiltinMedia: vi.fn(async () => undefined),
    selectedId: () => null,
    selectMonitor: vi.fn(),
    setContent: vi.fn(async () => undefined),
    setInteraction: vi.fn(async () => undefined),
    toggleMedia: vi.fn(async () => undefined),
    wallpapers: () => [],
  }
  const configureTracking = vi.fn<WallpaperLibraryController['configureTracking']>(
    async () => undefined,
  )
  const configureSpeech = vi.fn<WallpaperLibraryController['configureSpeech']>(
    async () => undefined,
  )
  const setWidgetMotion = vi.fn<WallpaperLibraryController['setWidgetMotion']>(
    async () => undefined,
  )
  const library: WallpaperLibraryController = {
    addWidget: vi.fn(async () => undefined),
    bindWidget: vi.fn(async () => undefined),
    configureSpeech,
    configureTracking,
    dismissError: vi.fn(),
    error: () => null,
    history: () => [],
    lastWebsite: () => null,
    ready: () => true,
    removeVisit: vi.fn(async () => undefined),
    removeWidget: vi.fn(async () => undefined),
    setWidgetMotion,
    trackWidget: vi.fn(async () => undefined),
    visit: vi.fn(async () => undefined),
    widgets,
  }
  render(() => <SPoffoWidgetSettings controller={controller} library={library} />)
  return {configureSpeech, configureTracking, setWidgetMotion, setWidgets}
}

test('should save animation selection only for the chosen widget and preserve its preview', () => {
  const {setWidgetMotion} = renderWidgets()
  const preview = screen.getByRole('figure', {name: 'Poffo 위젯 미리보기'})
  const canvas = preview.querySelector('canvas')
  fireEvent.click(screen.getByRole('button', {name: '위젯 2 설정'}))
  const select = screen.getByRole('combobox', {name: '기본 애니메이션'})
  fireEvent.keyDown(select, {key: 'End'})
  fireEvent.keyDown(select, {key: 'Enter'})
  expect(setWidgetMotion).toHaveBeenCalledExactlyOnceWith('second', null)
  expect(preview.querySelector('canvas')).toBe(canvas)
})

test('should apply speech settings only to the currently selected widget', () => {
  const {configureSpeech} = renderWidgets()
  fireEvent.click(screen.getByRole('radio', {name: '말풍선'}))
  const preview = screen.getByRole('figure', {name: 'Poffo 위젯 미리보기'})
  const canvas = preview.querySelector('canvas')
  const handle = within(preview).getByRole('button', {name: '말풍선 위치 조정'})
  expect(screen.getAllByRole('group', {name: '말풍선 위치'})).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', {name: '위젯 2 설정'}))
  fireEvent.keyDown(handle, {key: 'ArrowLeft'})
  expect(configureSpeech).toHaveBeenLastCalledWith('second', {
    enabled: true,
    x: 0.85,
    y: 0.05,
  })
  expect(preview.querySelector('canvas')).toBe(canvas)
  configureSpeech.mockClear()
  fireEvent.click(screen.getByRole('switch', {name: '이 위젯에 말풍선 표시'}))
  expect(configureSpeech).toHaveBeenCalledExactlyOnceWith('second', {
    enabled: false,
    x: 0.9,
    y: 0.05,
  })
})

test('should collapse every editor and reopen the same preview without resetting calibration', () => {
  const {configureSpeech} = renderWidgets()
  const header = screen.getByRole('button', {name: '위젯 1 설정'})
  const preview = screen.getByRole('figure', {name: 'Poffo 위젯 미리보기'})
  const canvas = preview.querySelector('canvas')
  const renders = vi.mocked(usePuppet).mock.calls.length
  fireEvent.click(header)
  expect(header).toHaveAttribute('aria-expanded', 'false')
  expect(screen.queryByRole('figure', {name: 'Poffo 위젯 미리보기'})).toBeNull()
  expect(preview.isConnected).toBe(true)
  fireEvent.click(header)
  expect(header).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByRole('figure', {name: 'Poffo 위젯 미리보기'})).toBe(preview)
  expect(preview.querySelector('canvas')).toBe(canvas)
  expect(usePuppet).toHaveBeenCalledTimes(renders)
  expect(configureSpeech).not.toHaveBeenCalled()
})

test('should keep one shared editor inside the selected widget and separate it from asset loading', () => {
  renderWidgets()
  const preview = screen.getByRole('figure', {name: 'Poffo 위젯 미리보기'})
  const loader = screen.getByRole('region', {name: 'Poffo 불러오기'})
  const editor = screen.getByRole('region', {name: '위젯 조정'})
  expect(loader.contains(preview)).toBe(false)
  expect(editor.contains(preview)).toBe(true)
  expect(within(loader).getByRole('button', {name: 'Poffo 불러오기'})).toBeDefined()
  expect(screen.queryByRole('button', {name: 'Poffo 파일 가져오기'})).toBeNull()
  expect(within(editor).queryByRole('button', {name: 'Poffo 파일 가져오기'})).toBeNull()
  expect(loader.compareDocumentPosition(editor)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)

  expect(screen.getByRole('region', {name: '시선 보정 설정'})).toBeDefined()
  expect(document.querySelectorAll('canvas')).toHaveLength(1)
  expect(within(preview).queryByRole('button', {name: '카메라 위치 조정'})).toBeNull()
  expect(screen.queryByRole('button', {name: /보정 설정/})).toBeNull()
  const rows = within(screen.getByRole('group', {name: '편집할 위젯'}))
  const first = rows.getByRole('button', {name: '위젯 1 설정'})
  const second = rows.getByRole('button', {name: '위젯 2 설정'})
  expect(first).toHaveAttribute('aria-expanded', 'true')
  expect(second).toHaveAttribute('aria-expanded', 'false')
  const canvas = preview.querySelector('canvas')
  const renderers = vi.mocked(usePuppet).mock.calls.length
  expect(first.closest('li')?.contains(preview)).toBe(true)
  expect(second.closest('li')?.contains(preview)).toBe(false)
  fireEvent.click(second)
  expect(first).toHaveAttribute('aria-expanded', 'false')
  expect(second).toHaveAttribute('aria-expanded', 'true')
  expect(first.closest('li')?.contains(preview)).toBe(false)
  expect(second.closest('li')?.contains(preview)).toBe(true)
  expect(second.closest('li')?.contains(screen.getByRole('region', {name: '시선 보정 설정'}))).toBe(
    true,
  )
  expect(preview.querySelector('canvas')).toBe(canvas)
  expect(usePuppet).toHaveBeenCalledTimes(renderers)
  fireEvent.click(first)
  expect(first.closest('li')?.contains(preview)).toBe(true)
  expect(second.closest('li')?.contains(preview)).toBe(false)
  expect(preview.querySelector('canvas')).toBe(canvas)
})

test('should apply calibration changes to the selected widget and preserve optimistic updates', () => {
  const {configureTracking, setWidgets} = renderWidgets()
  const preview = screen.getByRole('figure', {name: 'Poffo 위젯 미리보기'})
  const rows = within(screen.getByRole('group', {name: '편집할 위젯'}))
  fireEvent.click(rows.getByRole('button', {name: '위젯 2 설정'}))
  fireEvent.click(within(preview).getByRole('button', {name: '위치 핸들 표시'}))
  fireEvent.keyDown(within(preview).getByRole('button', {name: '얼굴 기준 조정'}), {
    key: 'ArrowDown',
  })
  expect(configureTracking.mock.lastCall?.[0]).toBe('second')
  expect(configureTracking.mock.lastCall?.[1].faceX).toBe(0.5)
  expect(configureTracking.mock.lastCall?.[1].faceY).toBeCloseTo(0.41)
  fireEvent.keyDown(within(preview).getByRole('button', {name: '카메라 위치 조정'}), {
    key: 'ArrowRight',
  })
  expect(configureTracking).toHaveBeenLastCalledWith('second', {
    cameraX: 0.51,
    cameraY: 0,
    faceY: 0.4,
  })
  fireEvent.click(screen.getByRole('radio', {name: '눈동자'}))
  fireEvent.click(screen.getByRole('button', {name: '눈동자 좌우 기본 방향 늘리기'}))
  expect(configureTracking).toHaveBeenLastCalledWith('second', {eyeCenterX: 0.05, faceY: 0.4})
  expect(screen.getAllByRole('region', {name: '시선 보정 설정'})).toHaveLength(1)
  setWidgets((widgets) =>
    widgets.map((widget) => ({
      ...widget,
      tracking: 'off',
      trackingOptions: {...widget.trackingOptions, eyeCenterY: 0.3, headCenterX: 4},
    })),
  )
  const rendering = vi.mocked(usePuppet).mock.lastCall![0]
  expect(within(preview).queryByRole('button', {name: '위치 핸들 표시'})).toBeNull()
  expect(rendering.tracking?.()).toBe('off')
  expect(rendering.trackingOptions?.()).toEqual({eyeCenterY: 0.3, faceY: 0.4, headCenterX: 4})
  setWidgets((widgets) =>
    widgets.map((widget) => ({
      ...widget,
      trackingOptions: {...widget.trackingOptions, headCenterX: 5},
    })),
  )
  expect(rendering.trackingOptions?.()?.headCenterX).toBe(5)
  const currentCanvas = preview.querySelector('canvas')
  const currentFirst = rows.getByRole('button', {name: '위젯 1 설정'})
  const currentSecond = rows.getByRole('button', {name: '위젯 2 설정'})
  fireEvent.click(currentFirst)
  expect(currentFirst).toHaveAttribute('aria-expanded', 'true')
  expect(currentSecond).toHaveAttribute('aria-expanded', 'false')
  expect(currentFirst.closest('li')?.contains(preview)).toBe(true)
  expect(preview.querySelector('canvas')).toBe(currentCanvas)
  expect(rendering.trackingOptions?.()?.faceY).toBe(0.2)
  fireEvent.click(screen.getByRole('radio', {name: '눈동자'}))
  fireEvent.click(screen.getByRole('button', {name: '눈동자 좌우 기본 방향 늘리기'}))
  expect(configureTracking.mock.lastCall?.[0]).toBe('first')
})

test('should select a remaining widget after closing the selected widget and show an asset preview when empty', () => {
  const {setWidgets} = renderWidgets()
  const preview = screen.getByRole('figure', {name: 'Poffo 위젯 미리보기'})
  const rows = within(screen.getByRole('group', {name: '편집할 위젯'}))
  fireEvent.click(rows.getByRole('button', {name: '위젯 2 설정'}))
  setWidgets((widgets) => widgets.filter((widget) => widget.id !== 'second'))
  expect(rows.getByRole('button', {name: '위젯 1 설정'})).toHaveAttribute('aria-expanded', 'true')
  expect(vi.mocked(usePuppet).mock.lastCall?.[0].assetId()).toBe('character')
  fireEvent.click(screen.getByRole('radio', {name: '말풍선'}))
  setWidgets([])
  expect(screen.queryByRole('group', {name: '위젯 편집 항목'})).toBeNull()
  expect(screen.queryByRole('region', {name: '위젯 말풍선 설정'})).toBeNull()
  expect(within(preview).queryByRole('button', {name: '위치 핸들 표시'})).toBeNull()
  expect(screen.queryByRole('region', {name: '시선 보정 설정'})).toBeNull()
  expect(within(preview).queryByRole('button', {name: '얼굴 기준 조정'})).toBeNull()
  expect(within(preview).queryByRole('button', {name: '카메라 위치 조정'})).toBeNull()
  expect(document.querySelectorAll('canvas')).toHaveLength(1)
})

test('should separate Poffo and speech controls without recreating the preview player', () => {
  renderWidgets()
  const preview = screen.getByRole('figure', {name: 'Poffo 위젯 미리보기'})
  const canvas = preview.querySelector('canvas')
  const players = vi.mocked(usePuppet).mock.calls.length
  expect(screen.getByRole('radio', {name: 'Poffo'})).toBeChecked()
  expect(screen.getByRole('combobox', {name: '트래킹 입력'})).toBeInTheDocument()
  expect(screen.queryByRole('region', {name: '위젯 말풍선 설정'})).not.toBeInTheDocument()
  expect(screen.queryByRole('button', {name: '말풍선 위치 조정'})).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('radio', {name: '말풍선'}))
  expect(screen.queryByRole('combobox', {name: '트래킹 입력'})).not.toBeInTheDocument()
  expect(screen.queryByRole('region', {name: '시선 보정 설정'})).not.toBeInTheDocument()
  expect(screen.getByRole('region', {name: '위젯 말풍선 설정'})).toBeInTheDocument()
  expect(screen.getByRole('button', {name: '말풍선 위치 조정'})).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: '위젯 2 설정'}))
  expect(screen.getByRole('radio', {name: '말풍선'})).toBeChecked()
  fireEvent.click(screen.getByRole('radio', {name: 'Poffo'}))
  expect(screen.getByRole('region', {name: '시선 보정 설정'})).toBeInTheDocument()
  expect(preview.querySelector('canvas')).toBe(canvas)
  expect(usePuppet).toHaveBeenCalledTimes(players)
})
