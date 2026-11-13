import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {page} from 'vitest/browser'
import {DEFAULT_POFFO_VOICE} from '@winter-love/wallpaper/settings/voice'
import {SPoffoVoiceSettings} from '../../src/components/SPoffoVoiceSettings'
import {createSynthesis} from '../../src/features/voice/synthesis'
import {createLiveSynthesis} from '../../src/features/voice/live-synthesis'
import 'virtual:uno.css'

vi.mock('../../src/features/voice/synthesis', () => ({createSynthesis: vi.fn()}))
vi.mock('../../src/features/voice/live-synthesis', () => ({createLiveSynthesis: vi.fn()}))

beforeEach(() => {
  const audio = {sampleRate: 48000, samples: new Float32Array(48000 * 30)}
  vi.mocked(createSynthesis).mockReturnValue({
    dispose: vi.fn(),
    generate: vi.fn().mockResolvedValue(audio),
  })
  vi.mocked(createLiveSynthesis).mockReturnValue({dispose: vi.fn(), generate: vi.fn()})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.resetAllMocks()
})

it('should return to preview without an alert when Stop cancels native Web Audio', async () => {
  const start = vi.spyOn(AudioBufferSourceNode.prototype, 'start')
  const stop = vi.spyOn(AudioBufferSourceNode.prototype, 'stop')
  const close = vi.spyOn(AudioContext.prototype, 'close')
  const resume = vi.spyOn(AudioContext.prototype, 'resume')
  const report = vi.spyOn(console, 'error')
  const [voice, setVoice] = createSignal(DEFAULT_POFFO_VOICE)
  render(() => <SPoffoVoiceSettings value={voice()} onChange={setVoice} />)

  await page.getByRole('button', {exact: true, name: '미리듣기'}).click()
  await expect.poll(() => start.mock.calls.length).toBe(1)
  await expect.poll(() => resume.mock.contexts[0]?.state).toBe('running')
  await expect.element(page.getByRole('status')).toHaveTextContent('재생 중…')
  await page.getByRole('button', {exact: true, name: '중지'}).click()
  await expect.element(page.getByRole('button', {exact: true, name: '미리듣기'})).toBeVisible()
  expect(screen.queryByRole('alert')).toBeNull()
  expect(stop).toHaveBeenCalledOnce()
  expect(report).not.toHaveBeenCalled()

  await page.getByRole('button', {exact: true, name: '미리듣기'}).click()
  await expect.poll(() => start.mock.calls.length).toBe(2)
  await page.getByRole('button', {exact: true, name: '중지'}).click()
  await expect.element(page.getByRole('button', {exact: true, name: '미리듣기'})).toBeVisible()
  expect(screen.queryByRole('alert')).toBeNull()
  expect(stop).toHaveBeenCalledTimes(2)
  cleanup()
  expect(close).toHaveBeenCalledOnce()
})
