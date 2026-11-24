import {cleanup, fireEvent, render, renderHook, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import {SCodexSpeechStack} from '../../src/components/SCodexSpeechStack'
import {CHARACTER_SPEECH_ID, useCharacterChat} from '../../src/features/conversation'
import type {CodexActivity} from '../../src/features/codex'
import 'virtual:uno.css'

afterEach(cleanup)

const settle = async (stack: HTMLElement, pass = 0): Promise<void> => {
  const animations = stack.getAnimations({subtree: true})
  animations.forEach((animation) => animation.finish())
  await Promise.allSettled(animations.map((animation) => animation.finished))
  await Promise.resolve()
  if (pass < 6 && stack.dataset.moving === 'true') {
    await settle(stack, pass + 1)
  }
}
const activities: readonly CodexActivity[] = ['A', 'B'].map((sessionId) => ({
  notificationId: 1,
  phase: 'response',
  receivedAt: 1,
  response: `${sessionId}의 응답`,
  sessionId,
  text: '응답 도착',
  title: sessionId,
  tool: null,
}))

test.each(['top', 'bottom'] as const)(
  'should stack below a top tail without moving the front with a saved %s anchor',
  async (anchor) => {
    const [target, setTarget] = createSignal({x: 250, y: 690})
    render(() => (
      <main class="box-border flex h-160 w-125 flex-col justify-center bg-stone-100 p-20">
        <SCodexSpeechStack activities={activities} anchor={anchor} target={target()} />
      </main>
    ))
    const stack = screen.getByRole('list', {name: 'Codex 채팅 알림'})
    const front = () =>
      screen.getAllByRole('listitem', {hidden: true}).find((card) => card.ariaPosInSet === '1')!
    const rear = () =>
      screen.getAllByRole('listitem', {hidden: true}).find((card) => card.ariaPosInSet === '2')!
    const frame = (card: HTMLElement) =>
      card.querySelector<HTMLElement>('aside > [aria-hidden="true"]')!
    await expect
      .poll(() => stack.querySelector('span[data-edge]')?.getAttribute('data-edge'))
      .toBe('bottom')
    await expect.poll(() => stack.getAnimations({subtree: true}).length).toBe(0)
    const initial = frame(front()).getBoundingClientRect().toJSON()
    setTarget({x: 250, y: 0})
    await expect
      .poll(() => stack.querySelector('span[data-edge]')?.getAttribute('data-edge'))
      .toBe('top')
    fireEvent.pointerEnter(stack)
    await expect.poll(() => stack.getAnimations({subtree: true}).length).toBe(0)
    expect(frame(front()).getBoundingClientRect().toJSON()).toEqual(initial)
    expect(frame(rear()).getBoundingClientRect().bottom).toBeGreaterThan(initial.bottom)
    const bounds = frame(rear()).getBoundingClientRect()
    const hit = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.bottom - 8)
    expect(rear().contains(hit)).toBe(true)
    await userEvent.click(hit!)
    await settle(stack)
    await expect.poll(() => stack.dataset.moving).toBe('false')
    expect(front().dataset.speechId).toBe('B')
    expect(frame(front()).getBoundingClientRect().toJSON()).toEqual(initial)
    expect(frame(rear()).getBoundingClientRect().bottom).toBeGreaterThan(initial.bottom)
    expect(stack.querySelectorAll('span[data-edge]')).toHaveLength(1)
    await page
      .getByRole('main')
      .screenshot({path: `__screenshots__/speech-top-tail-stacking-${anchor}.png`})
  },
)

test.each(['top', 'bottom'] as const)(
  'should give only the selected %s bubble a tail through side changes and character selection',
  async (anchor) => {
    const {result: character} = renderHook(() => useCharacterChat({widgetId: () => 'tail-widget'}))
    const [selected, setSelected] = createSignal<string | null>(null)
    const [target, setTarget] = createSignal({x: 0, y: 320})
    render(() => (
      <main class="box-border flex h-160 w-125 flex-col justify-center bg-stone-100 p-20">
        <SCodexSpeechStack
          activities={activities}
          anchor={anchor}
          character={character}
          target={target()}
          onSelected={setSelected}
        />
      </main>
    ))
    const stack = screen.getByRole('list', {name: '대화 말풍선'})
    const tails = () => [...stack.querySelectorAll<HTMLElement>('span[data-edge]')]
    await expect.poll(() => tails().length).toBe(1)
    const front = () => stack.querySelector<HTMLElement>(`[data-speech-id="${selected()}"]`)!
    const frame = () => front().querySelector<HTMLElement>('aside > [aria-hidden="true"]')!
    await expect.poll(() => stack.getAnimations({subtree: true}).length).toBe(0)
    const initial = frame().getBoundingClientRect().toJSON()
    fireEvent.pointerEnter(stack)
    await settle(stack)
    expect(frame().getBoundingClientRect().toJSON()).toEqual(initial)
    for (const entry of [
      {edge: 'left', point: {x: 0, y: 320}},
      {edge: 'right', point: {x: 800, y: 320}},
      {edge: 'top', point: {x: 250, y: 0}},
      {edge: 'bottom', point: {x: 250, y: 690}},
    ]) {
      setTarget(entry.point)
      // Each selection and its animation must finish before testing the next bubble.
      for (const choice of [
        {id: 'B', name: '채팅 B 선택'},
        {id: CHARACTER_SPEECH_ID, name: '캐릭터 대화 선택'},
        {id: 'A', name: '채팅 A 선택'},
      ]) {
        screen.getByRole('button', {name: choice.name}).focus()
        // eslint-disable-next-line no-await-in-loop
        await userEvent.keyboard('{Space}')
        expect(selected()).toBe(choice.id)
        expect(tails()).toHaveLength(1)
        expect(tails()[0]!.closest('[data-speech-id]')?.getAttribute('data-speech-id')).toBe(
          choice.id,
        )
        // eslint-disable-next-line no-await-in-loop
        await settle(stack)
        // eslint-disable-next-line no-await-in-loop
        await expect.poll(() => tails()[0]?.dataset.edge).toBe(entry.edge)
        expect(tails()).toHaveLength(1)
      }
      // eslint-disable-next-line no-await-in-loop
      await page
        .getByRole('main')
        .screenshot({path: `__screenshots__/speech-tail-${anchor}-${entry.edge}.png`})
    }
  },
)
