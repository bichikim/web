import {cleanup, render} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {page} from 'vitest/browser'
import {createAudioPlayer} from '../../src/features/voice/audio-player'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('should freeze the real audio clock through queued chunks and finish from that position on resume', async () => {
  const NativeAudioContext = AudioContext
  const contexts: AudioContext[] = []
  vi.stubGlobal(
    'AudioContext',
    class extends NativeAudioContext {
      constructor(options?: AudioContextOptions) {
        super(options)
        contexts.push(this)
      }
    },
  )
  const player = createAudioPlayer()
  const audio = {sampleRate: 24000, samples: new Float32Array(12000)}
  const ended = vi.fn()
  let playback: Promise<void> = Promise.resolve()
  const start = () => {
    playback = player.enqueue(audio, 0, new AbortController().signal).then(ended)
  }
  render(() => <button onClick={start}>재생 시작</button>)
  try {
    await page.getByRole('button', {name: '재생 시작'}).click()
    await expect.poll(() => contexts[0]?.state).toBe('running')
    await player.setPaused(true)
    const runtime = contexts[0]
    const frozen = runtime.currentTime
    const queued = player.enqueue(audio, 0, new AbortController().signal).then(ended)
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })
    expect(runtime.state).toBe('suspended')
    expect(runtime.currentTime).toBe(frozen)
    expect(ended).not.toHaveBeenCalled()
    await player.setPaused(false)
    await Promise.all([playback, queued])
    expect(runtime.currentTime).toBeGreaterThan(frozen)
    expect(ended).toHaveBeenCalledTimes(2)
  } finally {
    player.dispose()
  }
})
