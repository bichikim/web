// oxlint-disable no-await-in-loop -- Observe animation completion before sampling the following layout frames.
import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {invoke, isTauri} from '@tauri-apps/api/core'
import {SCodexSpeechStack} from '../../src/components/SCodexSpeechStack'
import {useSpeechSize} from '../../src/features/codex/use-speech-size'
import 'virtual:uno.css'

vi.mock('@tauri-apps/api/core', () => ({invoke: vi.fn(), isTauri: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
const draw = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
const settle = async () => {
  for (let phase = 0; phase < 8; phase += 1) {
    const animations = screen.getByRole('list').getAnimations({subtree: true})
    animations.forEach((animation) => animation.finish())
    await Promise.allSettled(animations.map((animation) => animation.finished))
    await draw()
  }
  await expect.poll(() => screen.getByRole('list').dataset.moving).toBe('false')
}

test.each(['top', 'bottom'] as const)(
  'should not resize the native %s canvas when a short bubble finishes moving to the front',
  async (anchor) => {
    vi.mocked(isTauri).mockReturnValue(true)
    vi.mocked(invoke).mockResolvedValue(undefined)
    render(() => {
      const [content, setContent] = createSignal<HTMLElement | null>(null)
      const [viewport, setViewport] = createSignal<HTMLElement | null>(null)
      useSpeechSize(content, {viewport})
      return (
        <main
          ref={setViewport}
          class="box-border flex h-[640px] w-[344px] p-9"
          classList={{'flex-col': anchor === 'top', 'flex-col-reverse': anchor === 'bottom'}}
        >
          <div ref={setContent}>
            <SCodexSpeechStack
              activities={[
                {
                  notificationId: 1,
                  phase: 'working',
                  receivedAt: 1,
                  sessionId: 'short',
                  text: '짧은 진행',
                  title: '짧은 말풍선',
                  tool: null,
                },
                {
                  notificationId: 2,
                  phase: 'response',
                  receivedAt: 2,
                  response: '긴 응답\n'.repeat(80),
                  sessionId: 'long',
                  text: '응답 도착',
                  title: '긴 말풍선',
                  tool: null,
                },
              ]}
            />
          </div>
        </main>
      )
    })
    await settle()
    const heights = () =>
      vi
        .mocked(invoke)
        .mock.calls.filter(([command]) => command === 'resize_poffo_speech')
        .map(([, options]) => (options as {height: number}).height)
    expect(heights()).toEqual([])
    screen.getByRole('button', {name: '채팅 긴 말풍선 선택'}).click()
    await settle()
    screen.getByRole('button', {name: '채팅 짧은 말풍선 선택'}).click()
    await settle()
    const front = screen.getAllByRole('listitem').find((card) => card.ariaPosInSet === '1')!
    const top = front.getBoundingClientRect().top
    for (let frame = 0; frame < 16; frame += 1) {
      await draw()
      expect(front.getBoundingClientRect().top).toBeCloseTo(top, 1)
      expect(heights()).toEqual([])
    }
  },
)
