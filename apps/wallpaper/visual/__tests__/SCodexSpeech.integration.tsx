import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it} from 'vitest'
import {SCodexSpeech} from '../../src/components/SCodexSpeech'
import type {VoiceStatus} from '../../src/features/voice/readout'
import 'virtual:uno.css'

afterEach(cleanup)
it.each(['bottom', 'top'] as const)(
  'should resize away from the %s anchor and keep side tails on the painted frame',
  async (anchor) => {
    const [reveal, setReveal] = createSignal(1)
    const [target, setTarget] = createSignal({x: -100, y: 200})
    render(() => (
      <div class="w-[272px] p-12" style={{'--speech-reveal': `${reveal()}`}}>
        <SCodexSpeech
          anchor={anchor}
          target={target()}
          activity={{
            notificationId: 1,
            phase: 'working',
            receivedAt: 1,
            sessionId: 'chat',
            text: '진행 내용\n'.repeat(15),
            tool: null,
          }}
        />
      </div>
    ))
    const bubble = screen.getByRole('status')
    const frame = bubble.querySelector<HTMLElement>(':scope > [aria-hidden="true"]')!
    const original = frame.getBoundingClientRect()
    setReveal(0.35)
    const compact = frame.getBoundingClientRect()
    expect(compact.height).toBeLessThan(original.height)
    expect(compact[anchor]).toBeCloseTo(original[anchor], 1)
    setTarget({x: compact.left - 100, y: compact.top + compact.height / 2})
    const tail = () => frame.querySelector<HTMLElement>('span')!
    await expect.poll(() => tail()?.dataset.edge).toBe('left')
    expect(
      tail().getBoundingClientRect().top + tail().getBoundingClientRect().height / 2,
    ).toBeCloseTo(compact.top + compact.height / 2, 1)
    setTarget({x: compact.right + 100, y: compact.top + compact.height / 2})
    await expect.poll(() => tail()?.dataset.edge).toBe('right')
    expect(
      tail().getBoundingClientRect().left + tail().getBoundingClientRect().width / 2,
    ).toBeCloseTo(compact.right - 1, 1)
  },
)
it('should animate preparation beside the speaker without shifting the header on playback', () => {
  const [status, setStatus] = createSignal<VoiceStatus>('generating')
  render(() => (
    <SCodexSpeech
      activity={{
        notificationId: 1,
        phase: 'working',
        receivedAt: 1,
        sessionId: 'chat',
        text: '숫자와 특수기호 전처리를 적용하고 있습니다.',
        title: '코드 뷰어를 클로드에 적용',
        tool: null,
      }}
      voiceState={status()}
      onDismiss={() => undefined}
      tone="sky"
    />
  ))
  const indicator = screen.getByRole('img', {name: '음성 생성 중'})
  const bounds = indicator.getBoundingClientRect()
  const spinner = indicator.querySelectorAll('svg')[1]
  expect(getComputedStyle(spinner).animationName).toBe('spin')
  expect(spinner.getBoundingClientRect().width).toBeGreaterThan(0)
  setStatus('playing')
  expect(screen.getByRole('img', {name: '말풍선 읽는 중'}).getBoundingClientRect().width).toBe(
    bounds.width,
  )
  expect(indicator.querySelectorAll('svg')).toHaveLength(1)
})
