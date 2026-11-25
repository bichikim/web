/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {afterAll, afterEach, beforeAll, beforeEach, expect, test, vi} from 'vitest'
import {createSignal} from 'solid-js'
import type {PoffoWidget} from '@winter-love/wallpaper/settings/library-model'
import type {WallpaperController} from '../../features/settings'
import type {WallpaperLibraryController} from '../../features/library'
import {usePuppet} from '../../features/background/use-puppet'
import {SPoffoWidgetSettings} from '../SPoffoWidgetSettings'

vi.mock('../../features/background/use-puppet', () => ({
  usePuppet: vi.fn(() => ({
    cancel: vi.fn(),
    canvasKey: () => document,
    finish: vi.fn(),
    lostCapture: vi.fn(),
    move: vi.fn(),
    ready: () => true,
    start: vi.fn(),
  })),
}))
vi.mock('../../features/tracking/use-parameters', () => ({
  useParameters: () => ({
    error: () => null,
    loading: () => false,
    parameters: () => [],
    touchParameters: () => [],
  }),
}))
vi.mock('../SPoffoTrackingBindings', () => ({SPoffoTrackingBindings: () => null}))
const originalHide = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'hidePopover')
const originalPopover = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {configurable: true, value: vi.fn()})
  Object.defineProperty(HTMLElement.prototype, 'hidePopover', {configurable: true, value: vi.fn()})
})
afterAll(() => {
  if (originalHide === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'hidePopover')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'hidePopover', originalHide)
  }
  if (originalPopover === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', originalPopover)
  }
})
beforeEach(() => {
  let identifier = 0
  const frames = new Map<number, FrameRequestCallback>()
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    identifier += 1
    const id = identifier
    frames.set(id, callback)
    queueMicrotask(() => {
      const pending = frames.get(id)
      frames.delete(id)
      pending?.(id * 16)
    })
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

const settleNavigation = () =>
  waitFor(() => {
    const root = screen.getByRole('region', {name: 'Poffo 위젯 설정'})
    expect(root).toHaveAttribute('aria-busy', 'false')
    expect(root.querySelector('[aria-busy="true"]')).toBeNull()
  })

const renderWidgets = async (expanded = true, enter = true) => {
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
  fireEvent.click(screen.getByRole('button', {name: '열린 위젯'}))
  await settleNavigation()
  if (enter) {
    fireEvent.click(screen.getByRole('button', {name: 'Character · 위젯 1'}))
    await settleNavigation()
  }
  if (expanded && enter) {
    fireEvent.click(screen.getByRole('button', {name: '기본'}))
    await screen.findByRole('combobox', {name: '기본 애니메이션'})
    fireEvent.click(screen.getByRole('button', {name: '미리보기 창 열기'}))
  }
  return {
    configureSpeech,
    configureTracking,
    removeWidget: library.removeWidget,
    setWidgetMotion,
    setWidgets,
  }
}

const selectWidget = async (name: string) => {
  const path = within(screen.getByRole('navigation', {name: '위젯 설정 경로'}))
  fireEvent.click(path.getByRole('combobox', {name: '편집할 위젯'}))
  fireEvent.click(screen.getByRole('option', {name}))
  await settleNavigation()
}
const selectCategory = (name: string) => {
  const control = screen.getByRole('combobox', {name: '위젯 편집 항목'})
  fireEvent.click(control)
  fireEvent.click(screen.getByRole('option', {name}))
  return control
}
const selectGroup = async (label: string, name: string) => {
  fireEvent.click(screen.getByRole('combobox', {name: label}))
  fireEvent.click(screen.getByRole('option', {name}))
  await settleNavigation()
}
const selectGaze = async () => {
  selectCategory('시선')
  await settleNavigation()
  await screen.findByRole('region', {name: '시선 보정 설정'})
  fireEvent.click(screen.getByRole('button', {name: '위치'}))
  await settleNavigation()
}

test('should show the widget overview with its inline preview and no preview window', async () => {
  await renderWidgets(false)
  expect(screen.getByRole('figure', {name: 'Poffo 위젯 미리보기'})).toBeVisible()
  expect(screen.getByRole('navigation', {name: '위젯 편집 목록'})).toBeVisible()
  expect(screen.queryByText('미리보기', {selector: 'summary'})).toBeNull()
  expect(screen.queryByRole('button', {name: '미리보기 창 열기'})).toBeNull()
  expect(screen.queryByRole('dialog', {name: '미리보기'})).toBeNull()
})

test('should separate bubble display from conversation and voice settings', async () => {
  await renderWidgets()
  expect(
    within(screen.getByRole('region', {name: '위젯 조정'})).queryByRole('combobox', {
      name: '편집할 위젯',
    }),
  ).toBeNull()
  expect(screen.queryByRole('button', {name: '위젯 닫기'})).toBeNull()
  expect(screen.getByRole('combobox', {name: '위젯 편집 항목'})).toHaveTextContent('기본')
  expect(screen.queryByRole('region', {name: '시선 보정 설정'})).toBeNull()
  selectCategory('말풍선')
  await settleNavigation()
  await screen.findByRole('region', {name: '위젯 말풍선 설정'})
  expect(screen.queryByRole('combobox', {name: '대화 모델'})).toBeNull()
  expect(screen.queryByRole('region', {name: '립싱크 연결'})).toBeNull()
})

test('should keep conversation, readout and lip sync together in their own category', async () => {
  await renderWidgets()
  selectCategory('대화·음성')
  await settleNavigation()
  await screen.findByRole('combobox', {name: '대화 모델'})
  expect(screen.getByRole('region', {name: '립싱크 연결'})).toBeInTheDocument()
  expect(screen.getByRole('switch', {name: '말풍선 읽어주기'})).toBeChecked()
  expect(screen.queryByRole('region', {name: '위젯 말풍선 설정'})).toBeNull()
})

test('should select a tab immediately and defer its content while preserving the preview', async () => {
  await renderWidgets()
  const preview = screen.getByRole('figure', {name: 'Poffo 위젯 미리보기'})
  const speech = selectCategory('말풍선')
  expect(speech).toHaveTextContent('말풍선')
  expect(screen.queryByRole('region', {name: '위젯 말풍선 설정'})).toBeNull()
  expect(screen.getByLabelText('위젯 조정').querySelector('[aria-busy]')).toHaveAttribute(
    'aria-busy',
    'true',
  )
  expect(screen.getByLabelText('위젯 조정').querySelector('[aria-busy]')).toHaveProperty(
    'inert',
    true,
  )
  expect(screen.getByLabelText('위젯 조정').querySelector('[aria-busy]')).toHaveClass('opacity-0')
  expect(screen.getByRole('status', {name: '페이지 전환 중'})).toBeInTheDocument()
  await screen.findByRole('region', {name: '위젯 말풍선 설정'})
  expect(
    screen.getByRole('region', {name: '위젯 조정'}).querySelector('[aria-busy]'),
  ).toHaveAttribute('aria-busy', 'false')
  expect(
    screen.getByRole('region', {name: '위젯 조정'}).querySelector('[aria-busy]'),
  ).toHaveProperty('inert', false)
  expect(preview.isConnected).toBe(true)
})

test('should render only the final tab when selection changes before deferred work runs', async () => {
  await renderWidgets()
  const dialog = screen.getByRole('dialog', {name: '미리보기'})
  const preview = within(dialog).getByRole('figure', {name: 'Poffo 위젯 미리보기'})
  selectCategory('말풍선')
  const behavior = selectCategory('행동')
  expect(behavior).toHaveTextContent('행동')
  expect(screen.queryByRole('region', {name: '행동 연결'})).toBeNull()
  await screen.findByRole('region', {name: '위젯 행동 설정'})
  expect(screen.queryByRole('region', {name: '위젯 말풍선 설정'})).toBeNull()
  expect(screen.getByRole('dialog', {name: '미리보기'})).toBe(dialog)
  expect(dialog).toHaveAttribute('aria-modal', 'false')
  expect(within(dialog).getByRole('figure', {name: 'Poffo 위젯 미리보기'})).toBe(preview)
})

test('should separate touch editing from gaze calibration without replacing its preview', async () => {
  const {configureSpeech} = await renderWidgets()
  const preview = screen.getByRole('figure', {name: 'Poffo 위젯 미리보기'})
  selectCategory('터치')
  await settleNavigation()
  await screen.findByRole('region', {name: '캐릭터 터치'})
  expect(screen.queryByRole('region', {name: '시선 보정 설정'})).toBeNull()
  expect(screen.queryByRole('combobox', {name: '트래킹 입력'})).toBeNull()
  expect(screen.getByRole('figure', {name: 'Poffo 위젯 미리보기'})).toBe(preview)
  expect(configureSpeech).not.toHaveBeenCalled()
})

test('should save the basic animation only for the selected widget', async () => {
  const {setWidgetMotion} = await renderWidgets()
  await selectWidget('Other · 위젯 2')
  expect(
    within(screen.getByRole('navigation', {name: '위젯 설정 경로'})).getByRole('combobox', {
      name: '편집할 위젯',
    }),
  ).toHaveAccessibleDescription('Other · 위젯 2')
  const select = screen.getByRole('combobox', {name: '기본 애니메이션'})
  fireEvent.keyDown(select, {key: 'End'})
  fireEvent.keyDown(select, {key: 'Enter'})
  expect(setWidgetMotion).toHaveBeenCalledExactlyOnceWith('second', null)
})

test('should keep file management in one menu instead of repeating it in each panel', async () => {
  await renderWidgets()
  const menu = screen.getByRole('button', {name: '위젯 설정 관리'})
  expect(screen.queryByRole('button', {name: '설정 JSON 저장'})).toBeNull()
  await selectGaze()
  expect(screen.getByRole('button', {name: '위젯 설정 관리'})).toBe(menu)
  fireEvent.click(menu)
  const dialog = within(screen.getByRole('dialog', {name: '위젯 설정 관리'}))
  expect(dialog.getAllByRole('button', {name: '설정 JSON 저장'})).toHaveLength(1)
  expect(dialog.getByRole('button', {name: '설정 JSON 불러오기'})).toBeInTheDocument()
})

test('should switch widgets in a fixed editor while preserving its canvas and selected category', async () => {
  await renderWidgets()
  await selectGaze()
  const preview = screen.getByRole('figure', {name: 'Poffo 위젯 미리보기'})
  const canvas = preview.querySelector('canvas')
  const renderers = vi.mocked(usePuppet).mock.calls.length
  const loader = screen.getByRole('region', {hidden: true, name: 'Poffo 불러오기'})
  const editor = screen.getByRole('region', {name: '위젯 조정'})
  expect(loader.contains(preview)).toBe(false)
  expect(editor.contains(preview)).toBe(false)
  await selectWidget('Other · 위젯 2')
  expect(screen.getByRole('button', {name: '시선 목록으로'})).toBeInTheDocument()
  expect(vi.mocked(usePuppet).mock.lastCall![0].trackingOptions?.()?.faceY).toBe(0.4)
  expect(screen.getAllByRole('region', {name: '시선 보정 설정'})).toHaveLength(1)
  expect(preview.querySelector('canvas')).toBe(canvas)
  expect(usePuppet).toHaveBeenCalledTimes(renderers)
  await selectWidget('Character · 위젯 1')
  expect(preview.querySelector('canvas')).toBe(canvas)
})

test('should return to the selected widget categories from its breadcrumb', async () => {
  await renderWidgets()
  const path = within(screen.getByRole('navigation', {name: '위젯 설정 경로'}))
  const preview = screen.getByRole('figure', {name: 'Poffo 위젯 미리보기'})
  fireEvent.click(path.getByRole('button', {name: 'Character · 위젯 1 목록으로'}))
  await settleNavigation()
  const categories = screen.getByRole('navigation', {name: '위젯 편집 목록'})
  expect(path.queryByRole('combobox', {name: '위젯 편집 항목'})).toBeNull()
  expect(path.getByRole('combobox', {name: '편집할 위젯'})).toHaveTextContent('Character · 위젯 1')
  fireEvent.click(within(categories).getByRole('button', {name: '터치'}))
  await screen.findByRole('region', {name: '캐릭터 터치'})
  expect(path.getByRole('combobox', {name: '위젯 편집 항목'})).toHaveTextContent('터치')
  expect(screen.getByRole('figure', {name: 'Poffo 위젯 미리보기'})).toBe(preview)
})

test('should apply calibration changes only to the selected widget and preserve optimistic updates', async () => {
  const {configureTracking} = await renderWidgets()
  await selectGaze()
  await selectWidget('Other · 위젯 2')
  const preview = screen.getByRole('figure', {name: 'Poffo 위젯 미리보기'})
  const calibration = within(screen.getByRole('region', {name: '시선 보정 설정'}))
  fireEvent.click(within(preview).getByRole('button', {name: '위치 핸들 표시'}))
  fireEvent.keyDown(within(preview).getByRole('button', {name: '얼굴 기준 조정'}), {
    key: 'ArrowDown',
  })
  expect(configureTracking.mock.lastCall?.[0]).toBe('second')
  expect(configureTracking.mock.lastCall?.[1].faceY).toBeCloseTo(0.41)
  fireEvent.keyDown(within(preview).getByRole('button', {name: '카메라 위치 조정'}), {
    key: 'ArrowRight',
  })
  expect(configureTracking).toHaveBeenLastCalledWith('second', {
    cameraX: 0.51,
    cameraY: 0,
    faceY: 0.4,
  })
  await selectGroup('보정 항목', '눈동자')
  fireEvent.click(calibration.getByRole('button', {name: '눈동자 중심 보정 좌우 늘리기'}))
  expect(configureTracking).toHaveBeenLastCalledWith('second', {eyeCenterX: 0.05, faceY: 0.4})
})

test('should follow external tracking changes without recreating the preview', async () => {
  const {setWidgets} = await renderWidgets()
  await selectGaze()
  await selectWidget('Other · 위젯 2')
  const preview = screen.getByRole('figure', {name: 'Poffo 위젯 미리보기'})
  const canvas = preview.querySelector('canvas')
  setWidgets((widgets) =>
    widgets.map((widget) => ({
      ...widget,
      tracking: 'off',
      trackingOptions: {...widget.trackingOptions, headCenterX: 5},
    })),
  )
  const rendering = vi.mocked(usePuppet).mock.lastCall![0]
  expect(rendering.tracking?.()).toBe('off')
  expect(rendering.trackingOptions?.()).toEqual({faceY: 0.4, headCenterX: 5})
  await selectWidget('Character · 위젯 1')
  expect(rendering.trackingOptions?.()?.faceY).toBe(0.2)
  expect(preview.querySelector('canvas')).toBe(canvas)
})

test('should close widgets from the list without entering their editor', async () => {
  const {removeWidget, setWidgets} = await renderWidgets()
  const preview = screen.getByRole('figure', {name: 'Poffo 위젯 미리보기'})
  fireEvent.click(screen.getByRole('button', {name: '열린 위젯 목록으로'}))
  await settleNavigation()
  expect(screen.queryByRole('button', {name: 'Poffo 파일 불러오기'})).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: 'Other · 위젯 2 닫기'}))
  expect(removeWidget).toHaveBeenCalledExactlyOnceWith('second')
  setWidgets((widgets) => widgets.filter((widget) => widget.id !== 'second'))
  expect(screen.getByRole('button', {name: 'Character · 위젯 1'})).toBeInTheDocument()
  expect(screen.queryByRole('button', {name: 'Other · 위젯 2'})).toBeNull()
  expect(screen.queryByRole('combobox', {name: '위젯 편집 항목'})).toBeNull()
  setWidgets([])
  expect(screen.queryByRole('combobox', {name: '편집할 위젯'})).toBeNull()
  expect(screen.queryByRole('group', {name: '위젯 편집 항목'})).toBeNull()
  expect(screen.queryByRole('region', {name: '시선 보정 설정'})).toBeNull()
  expect(screen.getByRole('figure', {hidden: true, name: 'Poffo 위젯 미리보기'})).toBe(preview)
  expect(screen.queryByRole('button', {name: 'Poffo 파일 불러오기'})).toBeNull()
})

test('should edit bubble display for the selected widget without changing its voice', async () => {
  const {configureSpeech} = await renderWidgets()
  selectCategory('말풍선')
  await settleNavigation()
  await screen.findByRole('region', {name: '위젯 말풍선 설정'})
  await selectWidget('Other · 위젯 2')
  fireEvent.click(screen.getByRole('radio', {name: '가로 스크롤'}))
  expect(configureSpeech.mock.lastCall?.[0]).toBe('second')
  expect(configureSpeech.mock.lastCall?.[1].wrap).toBe(false)
  expect(screen.queryByRole('switch', {name: '말풍선 읽어주기'})).toBeNull()
})

test('should edit voice for the selected widget without changing bubble display', async () => {
  const {configureSpeech} = await renderWidgets()
  selectCategory('대화·음성')
  await settleNavigation()
  await screen.findByRole('switch', {name: '말풍선 읽어주기'})
  await selectWidget('Other · 위젯 2')
  fireEvent.click(screen.getByRole('switch', {name: '말풍선 읽어주기'}))
  expect(configureSpeech.mock.lastCall?.[0]).toBe('second')
  expect(configureSpeech.mock.lastCall?.[1].voice?.enabled).toBe(false)
  expect(configureSpeech.mock.lastCall?.[1].enabled).toBe(true)
})

test('should select one behavior configuration panel without changing unrelated behavior settings', async () => {
  const {configureSpeech} = await renderWidgets()
  selectCategory('행동')
  await settleNavigation()
  await screen.findByRole('button', {name: '행동 연결'})
  fireEvent.click(screen.getByRole('button', {name: '행동 연결'}))
  await screen.findByRole('region', {name: '행동 연결'})
  await settleNavigation()
  await selectGroup('행동 설정 항목', '작업 상태 연결')
  expect(screen.queryByRole('region', {name: '행동 연결'})).toBeNull()
  expect(screen.getByRole('region', {name: '작업 상태 연결'})).toBeInTheDocument()
  await selectGroup('행동 설정 항목', '랜덤 행동')
  expect(screen.queryByRole('region', {name: '작업 상태 연결'})).toBeNull()
  fireEvent.click(screen.getByRole('switch', {name: '랜덤 행동 사용'}))
  expect(configureSpeech.mock.lastCall?.[1].randomActions).toEqual({
    enabled: true,
    probability: 0.5,
  })
})

test('should return through opened widgets and the widget overview without replacing the preview', async () => {
  await renderWidgets()
  const preview = screen.getByRole('figure', {name: 'Poffo 위젯 미리보기'})
  const path = within(screen.getByRole('navigation', {name: '위젯 설정 경로'}))
  expect(path.getByRole('button', {name: '위젯 목록으로'})).toBeInTheDocument()
  fireEvent.click(path.getByRole('button', {name: '열린 위젯 목록으로'}))
  await settleNavigation()
  expect(screen.getByRole('navigation', {name: '열린 위젯 목록'})).toBeVisible()
  expect(screen.queryByRole('combobox', {name: '위젯 편집 항목'})).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: 'Other · 위젯 2'}))
  await settleNavigation()
  expect(screen.getByRole('figure', {name: 'Poffo 위젯 미리보기'})).toBe(preview)
  fireEvent.click(path.getByRole('button', {name: '위젯 목록으로'}))
  await settleNavigation()
  expect(screen.getByRole('navigation', {name: '위젯 설정 목록'})).toBeVisible()
  expect(screen.queryByRole('combobox', {name: '위젯 화면 선택'})).toBeNull()
})

test('should switch sibling widget pages through the breadcrumb without modifying saved settings', async () => {
  const {configureSpeech, configureTracking} = await renderWidgets()
  await selectGroup('위젯 화면 선택', 'Poffo 불러오기')
  expect(screen.getByRole('region', {name: 'Poffo 불러오기'})).toBeVisible()
  expect(screen.getByRole('button', {name: 'Poffo 불러오기'})).toBeVisible()
  expect(screen.queryByRole('combobox', {name: '위젯 편집 항목'})).toBeNull()
  await selectGroup('위젯 화면 선택', '열린 위젯')
  expect(screen.getByRole('navigation', {name: '열린 위젯 목록'})).toBeVisible()
  expect(configureSpeech).not.toHaveBeenCalled()
  expect(configureTracking).not.toHaveBeenCalled()
})

test('should select a widget immediately and defer initial preview preparation', async () => {
  await renderWidgets(false, false)
  expect(usePuppet).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', {name: 'Character · 위젯 1'}))
  expect(screen.getByRole('navigation', {name: '위젯 설정 경로'})).toHaveTextContent(
    'Character · 위젯 1',
  )
  expect(screen.getByLabelText('Poffo 위젯 설정')).toHaveAttribute('aria-busy', 'true')
  expect(screen.getByLabelText('Poffo 위젯 설정').closest('[aria-hidden="true"]')).toHaveClass(
    'opacity-0',
  )
  expect(usePuppet).not.toHaveBeenCalled()
  await settleNavigation()
  expect(vi.mocked(usePuppet).mock.lastCall?.[0].assetId()).toBe('character')
  fireEvent.click(screen.getByRole('button', {name: '시선'}))
  const path = screen.getByRole('navigation', {name: '위젯 설정 경로'})
  expect(path).toHaveTextContent('시선')
  expect(path).not.toHaveTextContent('선택해 주세요')
  await settleNavigation()
})
