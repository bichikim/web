// oxlint-disable no-await-in-loop -- Each sampled animation phase must complete before the next phase or selection begins.
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {type Accessor, createSignal} from 'solid-js'
import {
  type CodexActivity,
  type CodexSnapshot,
  type CodexSpeechTarget,
  useCodexNotifications,
  useSpeechTarget,
} from '../../src/features/codex'
import {SPoffoSpeechSurface} from '../../src/components/SPoffoSpeechSurface'
import {invoke, isTauri} from '@tauri-apps/api/core'
import {createLibraryRepository} from '@winter-love/wallpaper/settings/library-repository'
import 'virtual:uno.css'

vi.mock('@tauri-apps/api/core', () => ({Channel: vi.fn(), invoke: vi.fn(), isTauri: vi.fn()}))

vi.mock('../../src/features/codex/use-codex-notifications', () => ({
  useCodexNotifications: vi.fn(),
}))
vi.mock('../../src/features/codex/use-speech-target', () => ({useSpeechTarget: vi.fn()}))
vi.mock('../../src/features/speech/use-widget-speech', () => ({
  useWidgetSpeech: () => ({
    error: () => null,
    speech: () => ({enabled: true, wrap: false, x: 0.9, y: 0.05}),
  }),
}))
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

const mount = (
  anchor: 'top' | 'bottom',
  maxHeight = 640,
  additional: readonly CodexActivity[] = [],
  insets: {insetTop?: number; insetBottom?: number} = {},
  movingTarget?: Accessor<CodexSpeechTarget>,
  widgetId?: string,
) => {
  const activity: CodexActivity = {
    notificationId: 1,
    phase: 'working',
    receivedAt: 1,
    sessionId: 'chat',
    text: '짧은 진행 메시지',
    title: '작업',
    tool: 'Bash',
  }
  const [snapshot, setSnapshot] = createSignal<CodexSnapshot>({
    activity,
    received: true,
    recent: [],
    registered: true,
    sessions: [activity, ...additional],
  })
  const target: CodexSpeechTarget = {anchor, maxHeight, x: 160, y: 680, ...insets}
  vi.mocked(useCodexNotifications).mockReturnValue({
    available: true,
    busy: () => false,
    configureQuestions: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    dismiss: undefined,
    error: () => null,
    refresh: vi.fn(),
    snapshot,
  })
  vi.mocked(useSpeechTarget).mockReturnValue(movingTarget ?? (() => target))
  render(() => <SPoffoSpeechSurface widgetId={widgetId} />)
  const update = (text: string) =>
    setSnapshot((value) => ({...value, sessions: [{...activity, text}]}))
  return update
}

test.each(['bottom', 'top'] as const)(
  'should pin short and long bubbles to the screen edge when the %s attachment has no space',
  async (anchor) => {
    const inset = window.innerHeight - 40
    const update = mount(
      anchor,
      320,
      [],
      anchor === 'bottom' ? {insetBottom: inset} : {insetTop: inset},
    )
    const bubble = screen.getByRole('status')
    const frame = bubble.querySelector<HTMLElement>('.wallpaper-speech-frame')!
    const boundary = () => frame.getBoundingClientRect()[anchor === 'bottom' ? 'top' : 'bottom']
    const expected = anchor === 'bottom' ? 12 : window.innerHeight - 12
    await expect.poll(boundary).toBeCloseTo(expected, 1)
    update('긴 메시지\n'.repeat(35))
    await expect.poll(() => screen.getByRole('list').getAnimations({subtree: true}).length).toBe(0)
    await expect.poll(boundary).toBeCloseTo(expected, 1)
    update('다시 짧은 메시지')
    await expect.poll(boundary).toBeCloseTo(expected, 1)
    expect(frame.getBoundingClientRect().top).toBeGreaterThanOrEqual(0)
    expect(frame.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight)
  },
)

test.each(['bottom', 'top'] as const)(
  'should keep differently sized cards inside the screen while reordering at the %s edge',
  async (anchor) => {
    const inset = window.innerHeight - 40
    mount(
      anchor,
      320,
      [
        {
          notificationId: 2,
          phase: 'response',
          receivedAt: 2,
          response: '긴 응답\n'.repeat(50),
          sessionId: 'long',
          text: '응답 도착',
          title: '긴 응답',
          tool: null,
        },
      ],
      anchor === 'bottom' ? {insetBottom: inset} : {insetTop: inset},
    )
    const list = screen.getByRole('list')
    await expect.poll(() => list.getAnimations({subtree: true}).length).toBe(0)
    fireEvent.click(screen.getByRole('button', {name: '채팅 긴 응답 선택'}))
    const samples: DOMRect[] = []
    let request = 0
    const capture = () => {
      for (const frame of list.querySelectorAll<HTMLElement>('.wallpaper-speech-frame')) {
        samples.push(frame.getBoundingClientRect())
      }
      request = requestAnimationFrame(capture)
    }
    request = requestAnimationFrame(capture)
    try {
      await expect.poll(() => list.dataset.moving, {timeout: 4000}).toBe('false')
    } finally {
      cancelAnimationFrame(request)
    }
    expect(samples.length).toBeGreaterThan(0)
    for (const bounds of samples) {
      expect(bounds.top).toBeGreaterThanOrEqual(0)
      expect(bounds.bottom).toBeLessThanOrEqual(window.innerHeight)
    }
  },
)

test.each(['bottom', 'top'] as const)(
  'should keep the character-side %s edge fixed before and after message measurement',
  async (anchor) => {
    const update = mount(anchor)
    const list = screen.getByRole('list', {name: 'Codex 채팅 알림'})
    const card = screen.getByRole('status')
    const edge = () => list.getBoundingClientRect()[anchor]
    await expect
      .poll(() => list.getBoundingClientRect().height)
      .toBe(card.getBoundingClientRect().height)
    const original = edge()
    // Hold the native viewport unchanged: the DOM must anchor before IPC completes.
    const change = async (text: string) => {
      update(text)
      expect(edge()).toBeCloseTo(original, 1)
      await expect
        .poll(() => list.getBoundingClientRect().height)
        .toBeCloseTo(card.getBoundingClientRect().height, 1)
      expect(edge()).toBeCloseTo(original, 1)
    }
    await change('진행 내용\n'.repeat(20))
    await change('짧은 메시지')
    await change('다시 긴 내용\n'.repeat(15))
  },
)

test('should interpolate height from the drawn layout and reverse immediately for a newer message', async () => {
  const update = mount('bottom')
  const list = screen.getByRole('list', {name: 'Codex 채팅 알림'})
  const card = screen.getByRole('status')
  await expect
    .poll(() => list.getBoundingClientRect().height)
    .toBe(card.getBoundingClientRect().height)
  await expect.poll(() => list.getAnimations().length).toBe(0)
  const initial = list.getBoundingClientRect()
  const painted = card.querySelector<HTMLElement>(':scope > [aria-hidden="true"]')!
  const initialFrame = painted.getBoundingClientRect()
  update('긴 진행 내용\n'.repeat(20))
  await expect.poll(() => list.getAnimations().length).toBe(1)
  const expansion = list.getAnimations()[0]
  expansion.pause()
  expansion.currentTime = 80
  const item = card.closest('[role="listitem"]')!
  expect(getComputedStyle(item).transitionProperty).toContain('--speech-height')
  await expect.poll(() => item.getAnimations().length).toBeGreaterThan(0)
  const resize = item.getAnimations()[0]
  resize.pause()
  resize.currentTime = 80
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
  const middle = list.getBoundingClientRect()
  expect(middle.height).toBeGreaterThan(initial.height)
  expect(middle.height).toBeLessThan(card.getBoundingClientRect().height)
  expect(middle.bottom).toBeCloseTo(initial.bottom, 1)
  expect(painted.getBoundingClientRect().bottom).toBeCloseTo(initialFrame.bottom, 1)
  expect(painted.getBoundingClientRect().height).toBeGreaterThan(initialFrame.height)
  expect(painted.getBoundingClientRect().height).toBeLessThan(card.getBoundingClientRect().height)
  update('새 메시지')
  expect(list.getBoundingClientRect().height).toBeCloseTo(middle.height, 1)
  await expect.poll(() => list.getAnimations()[0] !== expansion).toBe(true)
  await expect.poll(() => list.getBoundingClientRect().height).toBeCloseTo(initial.height, 1)
  expect(list.getBoundingClientRect().bottom).toBeCloseTo(initial.bottom, 1)
  expect(screen.getByText('새 메시지')).toBeVisible()
})

test('should keep the bottom anchor during viewport overflow and allow scrolling up', async () => {
  const update = mount('bottom', 900)
  const list = screen.getByRole('list')
  const main = screen.getByRole('main')
  await expect.poll(() => list.getAnimations().length).toBe(0)
  const bottom = list.getBoundingClientRect().bottom
  update('긴 진행 내용\n'.repeat(100))
  await expect.poll(() => list.getBoundingClientRect().height).toBeGreaterThan(main.clientHeight)
  await expect.poll(() => list.getAnimations().length).toBe(0)
  expect(list.getBoundingClientRect().bottom).toBeCloseTo(bottom, 1)
  const top = list.getBoundingClientRect().top
  main.scrollTop = -100
  expect(main.scrollTop).toBe(-100)
  expect(list.getBoundingClientRect().top).toBeCloseTo(top + 100, 1)
})

test.each(['bottom', 'top'] as const)(
  'should suppress outer scrollbar chrome through %s reordering while preserving response scrolling',
  async (anchor) => {
    mount(anchor, 640, [
      {
        notificationId: 2,
        phase: 'response',
        receivedAt: 2,
        response: `${'긴 응답과 가로로 이어지는 내용 '.repeat(20)}\n`.repeat(30),
        sessionId: 'response',
        text: '응답 도착',
        title: '긴 응답',
        tool: null,
      },
    ])
    const main = screen.getByRole('main')
    const list = screen.getByRole('list')
    const noOuterScrollbar = () => {
      expect(getComputedStyle(main).scrollbarWidth).toBe('none')
      expect(getComputedStyle(main, '::-webkit-scrollbar').display).toBe('none')
      expect(getComputedStyle(main).overflowY).toBe('clip')
      const before = list.getBoundingClientRect().top
      main.scrollTop = 100
      expect(main.scrollTop).toBe(0)
      expect(list.getBoundingClientRect().top).toBe(before)
    }
    noOuterScrollbar()
    for (const title of ['긴 응답', '작업']) {
      fireEvent.click(screen.getByRole('button', {name: `채팅 ${title} 선택`}))
      for (let stage = 0; stage < 6; stage += 1) {
        const animations = main.getAnimations({subtree: true})
        for (const animation of animations) {
          animation.pause()
          animation.currentTime = Number(animation.effect?.getTiming().duration ?? 0) / 2
        }
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve())
        })
        noOuterScrollbar()
        animations.forEach((animation) => animation.finish())
        await Promise.allSettled(animations.map((animation) => animation.finished))
      }
      await expect.poll(() => list.dataset.moving).toBe('false')
      noOuterScrollbar()
      if (title === '긴 응답') {
        const response = screen.getByRole('region', {name: '긴 응답 응답'})
        expect(getComputedStyle(response).overflow).toBe('auto')
        expect(getComputedStyle(response).scrollbarWidth).not.toBe('none')
        response.scrollLeft = 100
        expect(response.scrollLeft).toBe(100)
        response.scrollTop = 100
        expect(response.scrollTop).toBe(100)
      }
    }
  },
)

test('should keep a taller selected card inside the screen canvas during travel', async () => {
  mount(
    'bottom',
    480,
    [
      {
        notificationId: 2,
        phase: 'response',
        receivedAt: 2,
        response: '긴 응답\n'.repeat(80),
        sessionId: 'tall',
        text: '응답 도착',
        title: '긴 응답',
        tool: null,
      },
    ],
    {insetBottom: 220},
  )
  const surface = screen.getByRole('main', {name: 'Poffo Codex 말풍선'})
  const list = screen.getByRole('list')
  await expect.poll(() => list.getAnimations().length).toBe(0)
  const tall = screen.getAllByRole('listitem').find((card) => card.dataset.speechId === 'tall')!
  const short = screen.getAllByRole('listitem').find((card) => card !== tall)!
  expect(
    tall.getBoundingClientRect().height - short.getBoundingClientRect().height,
  ).toBeGreaterThan(200)
  const bounds = surface.getBoundingClientRect()
  const insideCanvas = () => {
    const drawn = tall.querySelector('aside > [aria-hidden="true"]')!.getBoundingClientRect()
    expect(drawn.bottom).toBeLessThanOrEqual(bounds.bottom)
    expect(drawn.top).toBeGreaterThanOrEqual(bounds.top)
    expect(surface.getBoundingClientRect().height).toBe(bounds.height)
  }
  screen.getByRole('button', {name: '채팅 긴 응답 선택'}).click()
  const lift = tall.getAnimations()[0]
  lift.pause()
  for (const progress of [0, 0.5, 1]) {
    lift.currentTime = 200 * progress
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
    insideCanvas()
  }
  lift.finish()
  await expect.poll(() => tall.ariaPosInSet).toBe('1')
  const travel = tall.getAnimations()[0]
  travel.pause()
  for (const progress of [0, 0.5, 1]) {
    travel.currentTime = Number(travel.effect!.getTiming().duration) * progress
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
    insideCanvas()
  }
})

test('should keep the bottom edge on the moving character anchor through consecutive size constraints', async () => {
  const [point, setPoint] = createSignal<CodexSpeechTarget>({
    anchor: 'bottom',
    insetBottom: 140,
    maxHeight: 560,
    x: 160,
    y: 680,
  })
  mount(
    'bottom',
    560,
    [
      {
        notificationId: 2,
        phase: 'response',
        receivedAt: 2,
        response: '응답\n'.repeat(80),
        sessionId: 'long',
        text: '응답 도착',
        title: '긴 응답',
        tool: null,
      },
    ],
    {},
    point,
  )
  screen.getByRole('button', {name: '채팅 긴 응답 선택'}).click()
  const list = screen.getByRole('list')
  for (let pass = 0; pass < 8; pass += 1) {
    const animations = list.getAnimations({subtree: true})
    animations.forEach((animation) => animation.finish())
    await Promise.allSettled(animations.map((animation) => animation.finished))
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  }
  const card = screen.getAllByRole('listitem').find((item) => item.ariaPosInSet === '1')!
  const main = screen.getByRole('main')
  const errors: number[] = []
  for (const height of [540, 520, 500, 480, 460, 480, 500, 520, 540, 560]) {
    setPoint((value) => ({...value, insetBottom: 700 - height, maxHeight: height}))
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
    const expected = main.getBoundingClientRect().bottom - (700 - height) - 36
    errors.push(Math.abs(card.getBoundingClientRect().bottom - expected))
  }
  expect(Math.max(...errors)).toBeLessThan(0.5)
})

test('should animate new content again after the character changes the available height', async () => {
  const [point, setPoint] = createSignal<CodexSpeechTarget>({
    anchor: 'bottom',
    insetBottom: 140,
    maxHeight: 560,
    x: 160,
    y: 680,
  })
  const update = mount('bottom', 560, [], {}, point)
  update('긴 진행 내용\n'.repeat(80))
  const list = screen.getByRole('list')
  await expect.poll(() => list.getBoundingClientRect().height).toBeCloseTo(488, 1)
  await expect.poll(() => list.getAnimations().length).toBe(0)
  setPoint((value) => ({...value, insetBottom: 220, maxHeight: 480}))
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
  expect(list.dataset.sizing).toBe('constraint')
  expect(list.getAnimations()).toHaveLength(0)
  update('새 진행 내용')
  await expect.poll(() => list.getAnimations().length).toBe(1)
  expect(list.dataset.sizing).toBe('content')
  const animation = list.getAnimations()[0]
  animation.pause()
  animation.currentTime = 80
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
  expect(list.getBoundingClientRect().height).toBeLessThan(408)
  expect(list.getBoundingClientRect().height).toBeGreaterThan(
    screen.getByRole('status').getBoundingClientRect().height,
  )
})

test('should drag a speech header, persist placement and suppress the following click', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  vi.mocked(invoke).mockResolvedValue(undefined)
  const repository = createLibraryRepository('wallpaper-library')
  const widget = await repository.addWidget('drag-character')
  try {
    mount(
      'bottom',
      640,
      [
        {
          notificationId: 2,
          phase: 'working',
          receivedAt: 2,
          sessionId: 'rear',
          text: '뒤쪽 메시지',
          title: '뒤쪽',
          tool: null,
        },
      ],
      {},
      () => ({
        anchor: 'bottom',
        maxHeight: 640,
        widgetHeight: 400,
        widgetWidth: 200,
        x: 160,
        y: 680,
      }),
      widget.id,
    )
    const list = screen.getByRole('list')
    await expect.poll(() => list.getAnimations({subtree: true}).length).toBe(0)
    const header = screen.getByRole('button', {name: '채팅 뒤쪽 선택'})
    expect(getComputedStyle(header).cursor).toBe('grab')
    vi.spyOn(header, 'setPointerCapture').mockImplementation(() => undefined)
    vi.spyOn(header, 'hasPointerCapture').mockReturnValue(true)
    vi.spyOn(header, 'releasePointerCapture').mockImplementation(() => undefined)
    fireEvent.pointerDown(header, {button: 0, pointerId: 1, screenX: 100, screenY: 200})
    fireEvent.pointerMove(header, {pointerId: 1, screenX: 140, screenY: 240})
    expect(screen.getByRole('main')).toHaveAttribute('data-dragging', 'true')
    expect(getComputedStyle(header).cursor).toBe('grabbing')
    expect(
      (await repository.read()).widgets.find((item) => item.id === widget.id)?.speech,
    ).toBeUndefined()
    fireEvent.pointerUp(header, {pointerId: 1, screenX: 140, screenY: 240})
    fireEvent.click(header, {detail: 1})
    expect(header).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('main')).toHaveAttribute('data-dragging', 'false')
    await expect
      .poll(
        async () => (await repository.read()).widgets.find((item) => item.id === widget.id)?.speech,
      )
      .toMatchObject({x: 1.1, y: 0.15})
    expect(invoke).toHaveBeenCalledWith('move_poffo_speech', {anchor: 'bottom', x: 1.1, y: 0.15})
    await expect
      .poll(
        () =>
          vi
            .mocked(invoke)
            .mock.calls.filter(([command]) => command === 'set_widget_hit_region')
            .at(-1)?.[1],
      )
      .toMatchObject({region: {interactive: false}})
  } finally {
    await repository.removeWidget(widget.id)
    repository.close()
  }
})
