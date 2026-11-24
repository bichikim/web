import {afterEach, expect, it, vi} from 'vitest'
import {cleanup, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {page} from 'vitest/browser'
import type {PoffoLipSync} from '@winter-love/wallpaper/settings/lipsync'
import {synthesizeVowel} from '../../../../packages/puppet/src/player/voice/__tests__/support/synthesize-vowel'
import {useMicrophoneLipSync} from '../../src/features/lipsync/use-microphone-lipsync'
import {type LipSyncFrame, subscribeLipSync} from '../../src/features/lipsync/channel'
import {SPoffoMicrophoneSettings} from '../../src/components/SPoffoMicrophoneSettings'
import {subscribeMicrophoneState} from '../../src/features/lipsync/microphone-channel'
import type {MicrophoneState} from '../../src/features/lipsync/types'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
it('should animate microphone poses without readout and filter quiet sound without reopening capture', async () => {
  const context = new AudioContext({sampleRate: 16000})
  const destination = context.createMediaStreamDestination()
  const tracks: MediaStreamTrack[] = []
  const capture = vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockImplementation(async () => {
    const stream = destination.stream.clone()
    tracks.push(...stream.getTracks())
    return stream
  })
  vi.spyOn(navigator.mediaDevices, 'enumerateDevices').mockResolvedValue([])
  const frames: LipSyncFrame[] = []
  let state: MicrophoneState | null = null
  const stopFrames = await subscribeLipSync('microphone-test', (frame) => frames.push(frame))
  const stopState = await subscribeMicrophoneState('microphone-test', (value) => {
    state = value
  })
  const [settings, setSettings] = createSignal<PoffoLipSync>({source: 'off'})
  try {
    render(() => {
      useMicrophoneLipSync({settings, widgetId: () => 'microphone-test'})
      const start = () => {
        context.resume()
        setSettings({source: 'microphone'})
      }
      const stop = () => setSettings({source: 'off'})
      return (
        <>
          <button onClick={start}>Start microphone</button>
          <button onClick={stop}>Stop microphone</button>
          <SPoffoMicrophoneSettings
            widgetId="microphone-test"
            value={settings().microphone}
            onChange={(microphone) => setSettings({...settings(), microphone})}
          />
        </>
      )
    })
    await page.getByRole('button', {name: 'Start microphone'}).click()
    await expect.poll(() => state?.phase).toBe('listening')
    const samples = synthesizeVowel([800, 1300], {
      length: 16000 * 3,
      pitch: 160,
      rate: 16000,
      rms: 0.08,
    })
    const source = context.createBufferSource()
    const buffer = context.createBuffer(1, samples.length, 16000)
    buffer.copyToChannel(new Float32Array(samples), 0)
    source.buffer = buffer
    source.loop = true
    source.connect(destination)
    source.start()
    await expect
      .poll(() =>
        frames.some(
          (frame) =>
            frame.source === 'microphone' && frame.level > 0.1 && (frame.weights?.a ?? 0) > 0,
        ),
      )
      .toBe(true)
    await expect
      .poll(() => Number(document.querySelector('[role="meter"]')?.getAttribute('aria-valuenow')))
      .toBeGreaterThan(15)
    const previous = frames.length
    setSettings({microphone: {threshold: 1}, source: 'microphone'})
    await expect.poll(() => frames.slice(previous).some((frame) => frame.level === 0)).toBe(true)
    expect(capture).toHaveBeenCalledOnce()
    expect(state?.level).toBeGreaterThan(0)
    await page.getByRole('button', {name: 'Stop microphone'}).click()
    await expect.poll(() => tracks.every((track) => track.readyState === 'ended')).toBe(true)
    await expect.poll(() => state?.phase).toBe('off')
    source.stop()
  } finally {
    stopFrames()
    stopState()
    destination.stream.getTracks().forEach((track) => track.stop())
    tracks.forEach((track) => track.stop())
    await context.close()
  }
})
