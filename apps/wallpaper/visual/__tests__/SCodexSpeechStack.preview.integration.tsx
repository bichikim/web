import {cleanup, fireEvent, render, screen, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import {SCodexSpeechStack} from '../../src/components/SCodexSpeechStack'
import type {CodexActivity} from '../../src/features/codex'
import {readSpeechMask} from '../../src/features/speech/read-speech-mask'
import {resolveClipPolygon} from '../../src/features/hit-test'
import 'virtual:uno.css'

const activities: CodexActivity[] = ['A', 'B', 'C'].map((sessionId) => ({
  notificationId: 1,
  phase: 'response',
  receivedAt: 1,
  response: '긴 응답입니다.\n'.repeat(80),
  sessionId,
  text: '응답 도착',
  title: sessionId,
  tool: null,
}))
const frame = (card: HTMLElement) =>
  card.querySelector<HTMLElement>('aside > [aria-hidden="true"]')!
const allCards = () => screen.getAllByRole('listitem', {hidden: true})
const front = () => allCards().find((card) => card.ariaPosInSet === '1')!
const settle = async (pass = 0): Promise<void> => {
  const animations = allCards().flatMap((card) => card.getAnimations())
  animations.forEach((animation) => animation.finish())
  await Promise.allSettled(animations.map((animation) => animation.finished))
  await Promise.resolve()
  await Promise.resolve()
  if (pass < 6 && screen.getByRole('list').dataset.moving === 'true') {
    await settle(pass + 1)
  }
}
const mount = (anchor: 'bottom' | 'top', initial = activities) => {
  const [items, setItems] = createSignal(initial)
  const [dragging, setDragging] = createSignal(false)
  const selected = vi.fn()
  render(() => (
    <main
      class="box-border flex h-[640px] w-[344px] flex-col bg-[#0e1215] p-9"
      classList={{'justify-end': anchor === 'bottom'}}
    >
      <SCodexSpeechStack
        anchor={anchor}
        activities={items()}
        dragging={dragging()}
        onSelected={selected}
      />
    </main>
  ))
  return {selected, setDragging, setItems}
}
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const draw = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
const finishPreview = async (element: Element) => {
  element.getBoundingClientRect()
  const animations = element.getAnimations()
  animations.forEach((animation) => animation.finish())
  await Promise.allSettled(animations.map((animation) => animation.finished))
  await draw()
}
const halfwayPreview = async (element: Element) => {
  const animations = element.getAnimations()
  expect(animations.length).toBeGreaterThan(0)
  animations.forEach((animation) => animation.pause())
  await Promise.all(animations.map((animation) => animation.ready))
  animations.forEach((animation) => {
    animation.currentTime = Number(animation.effect!.getTiming().duration) / 2
  })
  await draw()
}

test.each(['bottom', 'top'] as const)(
  'should keep the painted %s rear header and its clipping edge aligned during fading',
  async (anchor) => {
    mount(
      anchor,
      activities.map((item, index) => ({...item, response: index === 0 ? '' : item.response})),
    )
    await expect.poll(() => front().getBoundingClientRect().height).toBeGreaterThan(0)
    await expect.poll(() => screen.getByRole('list').getAnimations().length).toBe(0)
    const list = screen.getByRole('list')
    fireEvent.pointerEnter(list)
    const rear = allCards().find((card) => card.ariaPosInSet === '2')!
    const preview = rear.firstElementChild!
    await finishPreview(preview)
    const attached = frame(front()).getBoundingClientRect().toJSON()
    const clipping = () =>
      [rear, preview].flatMap((element) => {
        const bounds = element.getBoundingClientRect()
        const polygon = resolveClipPolygon({
          height: bounds.height,
          value: getComputedStyle(element).clipPath,
          width: bounds.width,
        })
        return polygon === null ? [] : [{bounds, polygon}]
      })
    const edge = () => {
      const [{bounds, polygon}] = clipping()
      return anchor === 'bottom'
        ? bounds.y + Math.min(...polygon.map((point) => point.y))
        : bounds.y + Math.max(...polygon.map((point) => point.y))
    }
    const initial =
      edge() - frame(rear).getBoundingClientRect()[anchor === 'bottom' ? 'top' : 'bottom']
    vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']})
    fireEvent.pointerLeave(list)
    vi.advanceTimersByTime(200)
    await halfwayPreview(preview)
    expect(
      edge() - frame(rear).getBoundingClientRect()[anchor === 'bottom' ? 'top' : 'bottom'],
    ).toBeCloseTo(initial, 1)
    expect(frame(front()).getBoundingClientRect().toJSON()).toEqual(attached)
    await page
      .getByRole('list')
      .screenshot({path: `__screenshots__/speech-preview-closing-${anchor}.png`})
  },
)

test.each(['bottom', 'top'] as const)(
  'should fade and slide rear cards from the %s front while preserving selection and pointer regions',
  async (anchor) => {
    const view = mount(anchor)
    await expect.poll(() => front().getBoundingClientRect().height).toBe(250)
    const list = screen.getByRole('list')
    const initial = frame(front()).getBoundingClientRect().toJSON()
    const rear = allCards().find((card) => card.ariaPosInSet === '2')!
    const preview = rear.firstElementChild!
    expect(getComputedStyle(preview).opacity).toBe('0')
    fireEvent.pointerEnter(list)
    await halfwayPreview(preview)
    const opening = getComputedStyle(preview)
    expect(Number(opening.opacity)).toBeGreaterThan(0)
    expect(Number(opening.opacity)).toBeLessThan(1)
    const shift = Number.parseFloat(opening.translate.split(' ')[1])
    expect(Math.abs(shift)).toBeGreaterThan(0)
    expect(Math.abs(shift)).toBeLessThan(12)
    expect(Math.sign(shift)).toBe(anchor === 'top' ? -1 : 1)
    expect(frame(front()).getBoundingClientRect().toJSON()).toEqual(initial)
    await page
      .getByRole('list')
      .screenshot({path: `__screenshots__/speech-preview-opening-${anchor}.png`})
    await finishPreview(preview)
    expect(getComputedStyle(preview).opacity).toBe('1')
    expect(rear.inert).toBe(false)
    vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']})
    fireEvent.pointerLeave(list)
    vi.advanceTimersByTime(200)
    await halfwayPreview(preview)
    const closing = getComputedStyle(preview)
    expect(Number(closing.opacity)).toBeGreaterThan(0)
    expect(Number(closing.opacity)).toBeLessThan(1)
    expect(closing.visibility).toBe('visible')
    expect(rear.inert).toBe(true)
    const bounds = frame(rear).getBoundingClientRect()
    expect(
      document
        .elementFromPoint(bounds.x + bounds.width / 2, bounds.y + 16)
        ?.closest('[role="listitem"]'),
    ).not.toBe(rear)
    fireEvent.pointerEnter(list)
    await finishPreview(preview)
    expect(getComputedStyle(preview).opacity).toBe('1')
    expect(getComputedStyle(preview).translate).toBe('0px')
    expect(rear.inert).toBe(false)
    expect(view.selected).toHaveBeenLastCalledWith('A')
    expect(frame(front()).getBoundingClientRect().toJSON()).toEqual(initial)
    fireEvent.pointerLeave(list)
    vi.advanceTimersByTime(200)
    await finishPreview(preview)
    expect(getComputedStyle(preview).visibility).toBe('hidden')
  },
)

test.each(['bottom', 'top'] as const)(
  'should reveal and hide rear cards without moving the %s front or retaining hidden hit regions',
  async (anchor) => {
    const view = mount(anchor)
    await expect.poll(() => front().getBoundingClientRect().height).toBe(250)
    await expect.poll(() => screen.getByRole('list').getAnimations().length).toBe(0)
    const list = screen.getByRole('list')
    const initial = frame(front()).getBoundingClientRect().toJSON()
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    const rear = allCards().find((card) => card.ariaPosInSet === '2')!
    const bounds = frame(rear).getBoundingClientRect()
    const x = bounds.x + bounds.width / 2
    const y = bounds.y + bounds.height / 2 + (anchor === 'top' ? 12 : -12)
    const canvas = document.createElement('canvas')
    const hitsRear = () => {
      const mask = readSpeechMask({canvas, element: list})
      const column = Math.floor((x / innerWidth) * mask.width)
      const row = Math.floor((y / innerHeight) * mask.height)
      return mask.runs.some(([line, start, end]) => line === row && column >= start && column < end)
    }
    expect(hitsRear()).toBe(false)
    await userEvent.hover(within(front()).getByRole('button', {name: '채팅 A 선택'}))
    await finishPreview(rear.firstElementChild!)
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(hitsRear()).toBe(true)
    expect(frame(front()).getBoundingClientRect().toJSON()).toEqual(initial)
    await userEvent.hover(within(rear).getByRole('button', {name: '채팅 B 선택'}))
    vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']})
    fireEvent.pointerMove(rear)
    vi.advanceTimersByTime(2999)
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    vi.advanceTimersByTime(1)
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(hitsRear()).toBe(false)
    expect(frame(front()).getBoundingClientRect().toJSON()).toEqual(initial)
    fireEvent.pointerMove(front())
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    fireEvent.pointerLeave(list)
    vi.advanceTimersByTime(199)
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    vi.advanceTimersByTime(1)
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    view.setItems(activities.map((item) => ({...item, notificationId: 2, response: '새 응답'})))
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(view.selected).toHaveBeenLastCalledWith('A')
    vi.useRealTimers()
    await page.getByRole('list').screenshot({path: `__screenshots__/speech-preview-${anchor}.png`})
  },
)

test('should retain drafts and selection during keyboard, pointer and drag interactions', async () => {
  const view = mount('bottom')
  await expect.poll(() => front().getBoundingClientRect().height).toBe(250)
  const list = screen.getByRole('list')
  const input = screen.getByRole('textbox', {name: 'Codex에 보낼 메시지'})
  await userEvent.fill(input, '보존할 다음 요청')
  vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']})
  fireEvent.pointerLeave(list)
  vi.advanceTimersByTime(4000)
  expect(screen.getAllByRole('listitem')).toHaveLength(3)
  expect(document.activeElement).toBe(input)
  input.blur()
  vi.advanceTimersByTime(200)
  expect(screen.getAllByRole('listitem')).toHaveLength(1)
  fireEvent.pointerEnter(list)
  fireEvent.pointerDown(front(), {pointerId: 1})
  fireEvent.pointerLeave(list)
  vi.advanceTimersByTime(4000)
  expect(screen.getAllByRole('listitem')).toHaveLength(3)
  fireEvent.pointerUp(globalThis, {pointerId: 1})
  vi.advanceTimersByTime(200)
  expect(screen.getAllByRole('listitem')).toHaveLength(1)
  view.setDragging(true)
  vi.advanceTimersByTime(4000)
  expect(screen.getAllByRole('listitem')).toHaveLength(3)
  view.setDragging(false)
  vi.advanceTimersByTime(200)
  expect(screen.getAllByRole('listitem')).toHaveLength(1)
  expect(screen.getByRole('textbox', {name: 'Codex에 보낼 메시지'})).toBe(input)
  expect(input).toHaveValue('보존할 다음 요청')
  vi.useRealTimers()
  within(front()).getByRole('button', {name: '채팅 A 선택'}).focus()
  await userEvent.keyboard('{Tab}')
  await Promise.all(allCards().map((card) => finishPreview(card.firstElementChild!)))
  expect(screen.getAllByRole('listitem')).toHaveLength(3)
  const rear = screen.getByRole('button', {name: '채팅 B 선택'})
  await userEvent.click(rear)
  await settle()
  await expect.poll(() => front().dataset.speechId).toBe('B')
  await expect.poll(() => list.dataset.moving).toBe('false')
  expect(view.selected).toHaveBeenLastCalledWith('B')
})
