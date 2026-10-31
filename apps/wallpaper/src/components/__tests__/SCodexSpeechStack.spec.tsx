/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {SCodexSpeechStack} from '../SCodexSpeechStack'
import type {CodexActivity} from '../../features/codex'

interface Motion {
  readonly element: HTMLElement
  readonly frames: Keyframe[]
  readonly options: KeyframeAnimationOptions
  readonly finish: () => void
  readonly cancel: ReturnType<typeof vi.fn>
}
const motions: Motion[] = []
const drawn = new Map<HTMLElement, {y: number; shadow: number; reveal?: number}>()
const activities: CodexActivity[] = ['A', 'B', 'C', 'D'].map((sessionId) => ({
  notificationId: 1,
  phase: 'response',
  receivedAt: 1,
  sessionId,
  text: `${sessionId} 응답`,
  title: sessionId,
  tool: null,
}))
const order = () =>
  screen
    .getAllByRole('listitem')
    .toSorted((first, second) => Number(first.ariaPosInSet) - Number(second.ariaPosInSet))
    .map((item) => item.querySelector('button')!.getAttribute('aria-label'))
const finish = async (motion: Motion) => {
  motion.finish()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}
beforeEach(() => {
  motions.length = 0
  drawn.clear()
  vi.stubGlobal('CSS', {registerProperty: vi.fn()})
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({matches: false})),
  )
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(100, 200, 320, 48),
  )
  const read = globalThis.getComputedStyle
  vi.spyOn(globalThis, 'getComputedStyle').mockImplementation((element) => {
    const style = read(element)
    const original = style.getPropertyValue.bind(style)
    vi.spyOn(style, 'getPropertyValue').mockImplementation((name) => {
      const value = drawn.get(element as HTMLElement)
      if (name === '--speech-y' && value !== undefined) {
        return `${value.y}px`
      }
      if (name === '--speech-reveal' && value?.reveal !== undefined) {
        return `${value.reveal}`
      }
      if (name === '--speech-depth' && value !== undefined) {
        return `${value.shadow}`
      }
      return original(name)
    })
    return style
  })
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    configurable: true,
    value: vi.fn(function value(
      this: HTMLElement,
      frames: Keyframe[],
      options: KeyframeAnimationOptions,
    ) {
      let finish: () => void = () => undefined
      const finished = new Promise<void>((resolve) => {
        finish = resolve
      })
      const cancel = vi.fn()
      motions.push({cancel, element: this, finish, frames, options})
      return {cancel, finished}
    }),
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(HTMLElement.prototype, 'animate')
})

it('should move C to the actual front without remounting or changing the other relative order', async () => {
  const selected = vi.fn()
  render(() => <SCodexSpeechStack activities={activities} onSelected={selected} />)
  expect(selected).toHaveBeenLastCalledWith('A')
  const nodes = screen.getAllByRole('status')
  fireEvent.click(screen.getByRole('button', {name: '채팅 C 선택'}))
  expect(selected).toHaveBeenLastCalledWith('C')
  const lift = motions.find((item) => item.options.duration === 300)!
  expect(lift.frames).toEqual([
    {
      '--speech-depth': '0',
      '--speech-height': '48px',
      '--speech-reveal': '0',
      '--speech-y': '36px',
    },
    {
      '--speech-depth': '1',
      '--speech-height': '48px',
      '--speech-reveal': '1',
      '--speech-y': '28px',
    },
  ])
  expect(order()).toEqual(['채팅 A 선택', '채팅 B 선택', '채팅 C 선택', '채팅 D 선택'])
  await finish(lift)
  expect(order()).toEqual(['채팅 C 선택', '채팅 A 선택', '채팅 B 선택', '채팅 D 선택'])
  expect(screen.getAllByRole('status')).toEqual([nodes[0], nodes[2], nodes[3], nodes[1]])
  const descent = motions.find((item) => item.options.duration === 500)!
  expect(descent.options.easing).toBe('cubic-bezier(.22, .8, .25, 1)')
  expect(descent.frames[1]).toEqual({
    '--speech-depth': '1',
    '--speech-height': '48px',
    '--speech-reveal': '1',
    '--speech-y': '108px',
  })
  await finish(descent)
  const settle = motions.at(-1)!
  expect(settle.frames).toEqual([
    {
      '--speech-depth': '1',
      '--speech-height': '48px',
      '--speech-reveal': '1',
      '--speech-y': '108px',
    },
    {
      '--speech-depth': '0',
      '--speech-height': '48px',
      '--speech-reveal': '1',
      '--speech-y': '108px',
    },
  ])
})

it('should retarget the drawn lift position and shadow while ignoring stale completions', async () => {
  render(() => <SCodexSpeechStack activities={activities} />)
  fireEvent.click(screen.getByRole('button', {name: '채팅 C 선택'}))
  const old = motions.find((item) => item.options.duration === 300)!
  drawn.set(old.element, {reveal: 0.4, shadow: 0.45, y: 32})
  fireEvent.click(screen.getByRole('button', {name: '채팅 B 선택'}))
  expect(old.cancel).toHaveBeenCalled()
  const latest = motions.filter((item) => item.options.duration === 300).at(-1)!
  expect(motions.find((item) => item.element === old.element && item !== old)?.frames[0]).toEqual({
    '--speech-depth': '0.45',
    '--speech-height': '48px',
    '--speech-reveal': '0.4',
    '--speech-y': '32px',
  })
  await finish(old)
  expect(order()[0]).toBe('채팅 A 선택')
  await finish(latest)
  expect(order()).toEqual(['채팅 B 선택', '채팅 A 선택', '채팅 C 선택', '채팅 D 선택'])
})

it('should preserve the committed order when interrupted in descent and use distance based timing', async () => {
  render(() => <SCodexSpeechStack activities={activities} />)
  fireEvent.click(screen.getByRole('button', {name: '채팅 C 선택'}))
  await finish(motions.find((item) => item.options.duration === 300)!)
  const descent = motions.find((item) => item.options.duration === 500)!
  drawn.set(descent.element, {shadow: 1, y: 65})
  fireEvent.click(screen.getByRole('button', {name: '채팅 D 선택'}))
  const lift = motions.filter((item) => item.options.duration === 300).at(-1)!
  expect(descent.cancel).toHaveBeenCalled()
  await finish(descent)
  await finish(lift)
  expect(order()).toEqual(['채팅 D 선택', '채팅 C 선택', '채팅 A 선택', '채팅 B 선택'])
  const travel = motions.find((item) => item.frames[0]['--speech-y'] === '-8px')!
  expect(travel.options.duration).toBe(725)
  expect(travel.frames[1]['--speech-y']).toBe('108px')
})

it('should retain selection and node identity across activity updates and support reduced motion', () => {
  vi.mocked(globalThis.matchMedia).mockReturnValue({matches: true} as MediaQueryList)
  const [items, setItems] = createSignal(activities)
  render(() => <SCodexSpeechStack activities={items()} />)
  fireEvent.click(screen.getByRole('button', {name: '채팅 C 선택'}))
  const selected = screen.getByRole('button', {name: '채팅 C 선택'}).closest('[role="status"]')
  setItems(activities.map((item) => ({...item, text: `${item.sessionId} 새 응답`})))
  expect(order()).toEqual(['채팅 C 선택', '채팅 A 선택', '채팅 B 선택', '채팅 D 선택'])
  expect(screen.getAllByRole('status').at(-1)).toBe(selected)
  expect(selected).toHaveTextContent('C 새 응답')
  expect(motions).toHaveLength(0)
})

it('should cancel owned animations when unmounted and ignore their later completion', async () => {
  const view = render(() => <SCodexSpeechStack activities={activities} />)
  fireEvent.click(screen.getByRole('button', {name: '채팅 C 선택'}))
  const lift = motions.find((item) => item.options.duration === 300)!
  view.unmount()
  expect(lift.cancel).toHaveBeenCalled()
  await finish(lift)
  expect(screen.queryAllByRole('status')).toHaveLength(0)
})

it('should keep the selected order when chats arrive or disappear', () => {
  vi.mocked(globalThis.matchMedia).mockReturnValue({matches: true} as MediaQueryList)
  const [items, setItems] = createSignal(activities)
  render(() => <SCodexSpeechStack activities={items()} />)
  fireEvent.click(screen.getByRole('button', {name: '채팅 C 선택'}))
  setItems([...activities, {...activities[0], sessionId: 'E', title: 'E'}])
  expect(order()).toEqual([
    '채팅 C 선택',
    '채팅 A 선택',
    '채팅 B 선택',
    '채팅 D 선택',
    '채팅 E 선택',
  ])
  setItems(activities.filter((item) => item.sessionId !== 'C'))
  expect(order()).toEqual(['채팅 A 선택', '채팅 B 선택', '채팅 D 선택'])
})

it('should preserve the drawn position when chats change during selection and discard the removed target', async () => {
  const [items, setItems] = createSignal(activities)
  render(() => <SCodexSpeechStack activities={items()} />)
  fireEvent.click(screen.getByRole('button', {name: '채팅 C 선택'}))
  const lift = motions.find((item) => item.options.duration === 300)!
  drawn.set(lift.element, {shadow: 0.4, y: 32})
  setItems([...activities, {...activities[0], sessionId: 'E', title: 'E'}])
  const latest = motions.filter((item) => item.options.duration === 300).at(-1)!
  expect(latest.frames[0]).toEqual({
    '--speech-depth': '0.4',
    '--speech-height': '48px',
    '--speech-reveal': '1',
    '--speech-y': '32px',
  })
  setItems(activities.filter((item) => item.sessionId !== 'C'))
  await finish(latest)
  await finish(lift)
  expect(order()).toEqual(['채팅 A 선택', '채팅 B 선택', '채팅 D 선택'])
})

it('should retain selection without animation when typed custom properties are unavailable', () => {
  vi.stubGlobal('CSS', {})
  render(() => <SCodexSpeechStack activities={activities} />)
  fireEvent.click(screen.getByRole('button', {name: '채팅 C 선택'}))
  expect(order()).toEqual(['채팅 C 선택', '채팅 A 선택', '채팅 B 선택', '채팅 D 선택'])
  expect(screen.getByRole('button', {name: '채팅 C 선택'})).toHaveAttribute('aria-pressed', 'true')
  expect(motions).toHaveLength(0)
})
