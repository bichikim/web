import {cleanup, fireEvent, render, renderHook, screen, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import {SCodexSpeechStack} from '../../src/components/SCodexSpeechStack'
import type {CodexActivity} from '../../src/features/codex'
import {readSpeechMask} from '../../src/features/speech/read-speech-mask'
import {CHARACTER_SPEECH_ID, useCharacterChat} from '../../src/features/conversation'
import 'virtual:uno.css'

afterEach(async () => {
  cleanup()
  vi.useRealTimers()
  await page.viewport(900, 700)
})
const activities: readonly CodexActivity[] = Array.from({length: 100}, (_, index) => ({
  notificationId: 1,
  phase: index === 0 || index === 99 ? 'response' : 'working',
  receivedAt: 1,
  response: index === 0 || index === 99 ? '내용을 확인합니다.\n'.repeat(40) : null,
  sessionId: `chat-${index + 1}`,
  text: '작업 중',
  title: `채팅 ${index + 1}`,
  tool: null,
}))
const list = () => screen.getByRole('list', {name: 'Codex 채팅 알림'})
const front = () =>
  within(list())
    .getAllByRole('listitem')
    .find((card) => card.ariaPosInSet === '1')!
const frame = () => front().querySelector<HTMLElement>('aside > [aria-hidden="true"]')!
const finish = async (stack = list(), pass = 0): Promise<void> => {
  const animations = stack.getAnimations({subtree: true})
  animations.forEach((animation) => animation.finish())
  await Promise.allSettled(animations.map((animation) => animation.finished))
  await Promise.resolve()
  if (pass < 6 && stack.dataset.moving === 'true') {
    await finish(stack, pass + 1)
  }
}
const mount = (anchor: 'top' | 'bottom', initial = activities) => {
  const [items, setItems] = createSignal(initial)
  const selected = vi.fn()
  render(() => (
    <main
      class="box-border flex h-160 w-86 flex-col bg-stone-100 p-9"
      classList={{'justify-end': anchor === 'bottom'}}
    >
      <SCodexSpeechStack activities={items()} anchor={anchor} onSelected={selected} />
    </main>
  ))
  return {selected, setItems}
}

test.each(['bottom', 'top'] as const)(
  'should show one resting bubble, three hovered bubbles and a searchable overflow without moving the %s front',
  async (anchor) => {
    await page.viewport(344, 700)
    const view = mount(anchor)
    await expect.poll(() => frame().getBoundingClientRect().height).toBe(250)
    await expect.poll(() => list().getAnimations({subtree: true}).length).toBe(0)
    const initial = frame().getBoundingClientRect().toJSON()
    const draft = within(front()).getByRole('textbox', {name: 'Codex에 보낼 메시지'})
    fireEvent.input(draft, {target: {value: '보존할 입력'}})
    expect(within(list()).getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByRole('button', {name: '다른 대화 97개'})).toHaveTextContent('+97')
    fireEvent.pointerEnter(list())
    await finish()
    expect(within(list()).getAllByRole('listitem')).toHaveLength(3)
    expect(frame().getBoundingClientRect().toJSON()).toEqual(initial)
    await page.getByRole('button', {name: '다른 대화 97개'}).click()
    const dialog = screen.getByRole('dialog', {name: '다른 대화'})
    expect(within(dialog).getAllByRole('button')).toHaveLength(98)
    const bounds = dialog.getBoundingClientRect()
    expect(bounds.left).toBeGreaterThanOrEqual(0)
    expect(bounds.right).toBeLessThanOrEqual(innerWidth)
    expect(bounds.top).toBeGreaterThanOrEqual(0)
    expect(bounds.bottom).toBeLessThanOrEqual(innerHeight)
    expect(frame().getBoundingClientRect().toJSON()).toEqual(initial)
    const mask = readSpeechMask({
      canvas: document.createElement('canvas'),
      element: screen.getByRole('main'),
    })
    const x = Math.floor(((bounds.left + bounds.right) / 2 / innerWidth) * mask.width)
    const y = Math.floor(((bounds.top + bounds.bottom) / 2 / innerHeight) * mask.height)
    expect(mask.runs.some(([row, start, end]) => row === y && x >= start && x < end)).toBe(true)
    await page.getByRole('main').screenshot({path: `__screenshots__/speech-overflow-${anchor}.png`})
    await page.getByRole('searchbox', {name: '대화 찾기'}).fill('채팅 100')
    expect(within(dialog).getAllByRole('button')).toHaveLength(2)
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => screen.queryByRole('dialog', {name: '다른 대화'})).toBeNull()
    expect(draft).toHaveValue('보존할 입력')
    expect(frame().getBoundingClientRect().toJSON()).toEqual(initial)
    expect(view.selected).toHaveBeenLastCalledWith('chat-1')
    await page.getByRole('button', {name: '다른 대화 97개'}).click()
    await page.getByRole('searchbox', {name: '대화 찾기'}).fill('채팅 100')
    await userEvent.keyboard('{ArrowDown}{Enter}')
    await expect.poll(() => front().dataset.speechId).toBe('chat-100')
    await expect.poll(() => list().dataset.moving).toBe('false')
    expect(screen.queryByRole('dialog', {name: '다른 대화'})).toBeNull()
    expect(view.selected).toHaveBeenLastCalledWith('chat-100')
    expect(frame().getBoundingClientRect().toJSON()).toEqual(initial)
    view.setItems((items) =>
      items.map((item) =>
        item.sessionId === 'chat-20'
          ? {...item, notificationId: 2, phase: 'response', response: '뒤에서 도착한 답변'}
          : item,
      ),
    )
    expect(view.selected).toHaveBeenLastCalledWith('chat-100')
    fireEvent.pointerEnter(list())
    await finish()
    await page.getByRole('button', {name: '채팅 채팅 1 선택'}).click()
    await expect.poll(() => front().dataset.speechId).toBe('chat-1')
    await finish()
    expect(within(front()).getByRole('textbox')).toHaveValue('보존할 입력')
    await expect.poll(() => list().dataset.moving).toBe('false')
    const focused = document.activeElement
    if (focused instanceof HTMLElement) {
      focused.blur()
    }
    vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']})
    fireEvent.pointerMove(list())
    fireEvent.pointerLeave(list())
    vi.advanceTimersByTime(200)
    expect(within(list()).getAllByRole('listitem')).toHaveLength(1)
    expect(frame().getBoundingClientRect().toJSON()).toEqual(initial)
  },
)

test('should clear dismissed overflow hit regions and retain the front when conversations disappear', async () => {
  const items = activities.map((item, index) =>
    index === 0 ? {...item, response: '짧은 답변'} : item,
  )
  const view = mount('bottom', items)
  await expect.poll(() => frame().getBoundingClientRect().height).toBeGreaterThan(0)
  await expect.poll(() => list().getAnimations({subtree: true}).length).toBe(0)
  const initial = frame().getBoundingClientRect().toJSON()
  await page.getByRole('button', {name: '다른 대화 97개'}).click()
  const dialog = screen.getByRole('dialog', {name: '다른 대화'})
  const bounds = dialog.getBoundingClientRect()
  const cards = within(list())
    .getAllByRole('listitem')
    .map((card) => card.querySelector('aside > [aria-hidden="true"]')!.getBoundingClientRect())
  const point = [bounds.top + 12, bounds.bottom - 12]
    .map((y) => ({x: bounds.left + bounds.width / 2, y}))
    .find(({x, y}) =>
      cards.every((card) => x < card.left || x > card.right || y < card.top || y > card.bottom),
    )!
  expect(point).toBeDefined()
  const hit = () => {
    const mask = readSpeechMask({
      canvas: document.createElement('canvas'),
      element: screen.getByRole('main'),
    })
    const x = Math.floor((point.x / innerWidth) * mask.width)
    const y = Math.floor((point.y / innerHeight) * mask.height)
    return mask.runs.some(([row, start, end]) => row === y && x >= start && x < end)
  }
  expect(hit()).toBe(true)
  await userEvent.keyboard('{Escape}')
  expect(hit()).toBe(false)
  await page.getByRole('button', {name: '다른 대화 97개'}).click()
  view.setItems(items.slice(0, 2))
  await expect.poll(() => screen.queryByRole('dialog', {name: '다른 대화'})).toBeNull()
  expect(screen.queryByRole('button', {name: /다른 대화/})).toBeNull()
  await expect.poll(() => frame().getBoundingClientRect().bottom).toBe(initial.bottom)
  expect(frame().getBoundingClientRect().x).toBe(initial.x)
  expect(frame().getBoundingClientRect().width).toBe(initial.width)
  expect(view.selected).toHaveBeenLastCalledWith('chat-1')
})

test('should select the character from overflow and retain its draft across conversations', async () => {
  const {result: character} = renderHook(() =>
    useCharacterChat({widgetId: () => 'character-overflow'}),
  )
  const selected = vi.fn()
  render(() => (
    <main class="box-border flex h-160 w-86 flex-col justify-end p-9">
      <SCodexSpeechStack
        activities={activities.slice(0, 3)}
        character={character}
        onSelected={selected}
      />
    </main>
  ))
  const stack = screen.getByRole('list', {name: '대화 말풍선'})
  await page.getByRole('button', {name: '다른 대화 1개'}).click()
  await page.getByRole('button', {exact: true, name: '캐릭터와 대화 대화 가능'}).click()
  await expect.poll(() => selected.mock.calls.at(-1)?.[0]).toBe(CHARACTER_SPEECH_ID)
  await page.getByRole('textbox', {name: '캐릭터에게 보낼 메시지'}).fill('캐릭터 초안')
  fireEvent.pointerEnter(stack)
  await page.getByRole('button', {name: '채팅 채팅 1 선택'}).click()
  await finish(stack)
  await expect.poll(() => stack.dataset.moving).toBe('false')
  expect(selected).toHaveBeenLastCalledWith('chat-1')
  expect(character.draft()).toBe('캐릭터 초안')
  expect(within(stack).getAllByRole('listitem').length).toBeLessThanOrEqual(3)
})
