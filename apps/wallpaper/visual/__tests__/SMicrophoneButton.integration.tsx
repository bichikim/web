import {cleanup, render, screen, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {page} from 'vitest/browser'
import {SMicrophoneButton} from '../../src/components/SMicrophoneButton'
import {createMicrophoneMeter, type DictationState} from '../../src/features/dictation'
import 'virtual:uno.css'

afterEach(cleanup)

test('should distinguish waiting from listening with a paused microphone and a takeover action', async () => {
  const onClick = vi.fn()
  render(() => (
    <div class="w-8 bg-teal-50 p-2">
      <SMicrophoneButton continuous state="waiting" onClick={onClick} />
    </div>
  ))
  const microphone = screen.getByRole('button', {name: '답변 중단하고 말하기'})
  expect(microphone).toHaveAttribute('aria-pressed', 'true')
  expect(microphone.title).toContain('마이크 대기 중')
  expect(within(microphone).getByRole('img', {name: '마이크 대기 중'})).toBeVisible()
  expect(getComputedStyle(microphone).color).toBe('rgb(87, 83, 78)')
  await page.getByRole('button', {name: '답변 중단하고 말하기'}).screenshot({
    path: '__screenshots__/microphone-waiting.png',
  })
  await page.getByRole('button', {name: '답변 중단하고 말하기'}).click()
  expect(onClick).toHaveBeenCalledOnce()
})

test('should show real audio signal levels in the microphone and stop monitoring on a second click', async () => {
  const context = new AudioContext()
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  const output = context.createMediaStreamDestination()
  gain.gain.value = 0
  oscillator.connect(gain).connect(output)
  oscillator.start()
  const [state, setState] = createSignal<DictationState>('idle')
  const [level, setLevel] = createSignal(0)
  const failures = vi.fn()
  let stopMeter: (() => void) | undefined
  const toggle = () => {
    if (state() === 'recording') {
      stopMeter?.()
      setState('idle')
      return
    }
    context.resume().catch(failures)
    stopMeter = createMicrophoneMeter({onError: failures, onLevel: setLevel, stream: output.stream})
    setState('recording')
  }
  render(() => (
    <div class="w-8 bg-teal-50 p-2">
      <SMicrophoneButton state={state()} level={level()} onClick={toggle} />
    </div>
  ))
  try {
    await page.getByRole('button', {name: '음성 입력'}).click()
    const microphone = screen.getByRole('button', {name: '녹음 끝내기'})
    const fill = microphone.querySelector('rect')!
    expect(microphone).toHaveAttribute('aria-pressed', 'true')
    gain.gain.value = 0.01
    await expect.poll(level, {timeout: 3000}).toBeGreaterThan(0.2)
    const quiet = level()
    const quietFill = getComputedStyle(fill).clipPath
    gain.gain.value = 0.15
    await expect.poll(level, {timeout: 3000}).toBeGreaterThan(quiet + 0.25)
    expect(getComputedStyle(fill).clipPath).not.toBe(quietFill)
    await page
      .getByRole('button', {name: '녹음 끝내기'})
      .screenshot({path: '__screenshots__/microphone-live-signal.png'})
    gain.gain.value = 0
    await expect.poll(level, {timeout: 3000}).toBe(0)
    await page.getByRole('button', {name: '녹음 끝내기'}).click()
    expect(level()).toBe(0)
    expect(screen.getByRole('button', {name: '음성 입력'})).toHaveAttribute('aria-pressed', 'false')
    expect(failures).not.toHaveBeenCalled()
  } finally {
    stopMeter?.()
    oscillator.stop()
    output.stream.getTracks().forEach((track) => track.stop())
    await context.close()
  }
})
