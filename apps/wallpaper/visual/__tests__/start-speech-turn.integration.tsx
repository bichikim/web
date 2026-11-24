import {afterEach, expect, test, vi} from 'vitest'
import {cleanup, render} from '@solidjs/testing-library'
import {page} from 'vitest/browser'
import speechUrl from '../../../wallpaper-web/public/speech/overview/audio.mp3?url'
import {startSpeechTurn} from '../../src/features/dictation/start-speech-turn'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

test.each(['silence', 'stop'] as const)(
  'should finish real Silero speech on %s and release the microphone',
  async (completionMode) => {
    const context = new AudioContext()
    const output = context.createMediaStreamDestination()
    vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockResolvedValue(output.stream)
    const controller = new AbortController()
    try {
      const response = await fetch(speechUrl)
      const buffer = await context.decodeAudioData(await response.arrayBuffer())
      let opening: ReturnType<typeof startSpeechTurn> | undefined
      const start = () => {
        context.resume()
        opening = startSpeechTurn(controller.signal)
      }
      render(() => <button onClick={start}>듣기</button>)
      await page.getByRole('button', {name: '듣기'}).click()
      const capture = await opening!
      let audio: Float32Array | undefined
      const completion = capture.audio.then((value) => {
        audio = value
      })
      expect(audio).toBeUndefined()
      expect(output.stream.getAudioTracks()[0].readyState).toBe('live')
      const source = context.createBufferSource()
      source.buffer = buffer
      source.connect(output)
      const ended = new Promise<void>((resolve) => {
        source.addEventListener('ended', () => resolve(), {once: true})
      })
      await context.resume()
      source.start(0, 0, 2.5)
      if (completionMode === 'stop') {
        await ended
        capture.stop()
      }
      await expect.poll(() => audio?.length, {timeout: 15_000}).toBeGreaterThan(16_000)
      await completion
      expect(audio!.length).toBeLessThan(16_000 * 6)
      expect(output.stream.getAudioTracks()[0].readyState).toBe('ended')
    } finally {
      controller.abort()
      output.stream.getTracks().forEach((track) => track.stop())
      await context.close()
    }
  },
  30_000,
)
