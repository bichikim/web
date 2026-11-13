import * as tone from 'tone'
import {expect, it} from 'vitest'
import {encodeMonoPcm16Wav} from 'src/utils/encode-mono-pcm16-wav'
import {createSoundRuntime} from '../runtime'
import type {SoundVoice} from '../types'

it('should preserve native Tone completion through pause and resume', async () => {
  const sampleRate = 16_000
  const sourceFrames = 1_600
  const amplitude = 0.2
  const pauseAt = 0.02
  const resumeAt = 0.05
  const renderDuration = 0.4
  const audibleFloor = 0.001
  const afterEnd = 0.5
  const source = URL.createObjectURL(
    new Blob([encodeMonoPcm16Wav(new Float32Array(sourceFrames).fill(amplitude), sampleRate)], {
      type: 'audio/wav',
    }),
  )
  const trace: Array<readonly [string, boolean]> = []
  let voice: SoundVoice | undefined
  let rendered: tone.ToneAudioBuffer | undefined

  try {
    rendered = await tone.Offline(
      async (context) => {
        const runtime = await createSoundRuntime()
        const current = runtime.createVoice({
          onEnded: () => trace.push(['ended', current.finished]),
        })
        voice = current
        await current.load(source)
        current.configure({enabled: true, loop: false, overlapSeconds: 0, volume: 0.1})
        current.play(0, false)
        trace.push(['playing', current.finished])
        context.transport.scheduleOnce((time) => {
          current.pause(time)
          trace.push(['paused', current.finished])
        }, pauseAt)
        context.transport.scheduleOnce((time) => {
          current.play(time, true)
          trace.push(['resumed', current.finished])
        }, resumeAt)
        context.transport.start(0)
      },
      renderDuration,
      1,
      sampleRate,
    )

    await expect.poll(() => trace.filter(([event]) => event === 'ended').length).toBe(1)
    expect(trace).toEqual([
      ['playing', false],
      ['paused', false],
      ['resumed', false],
      ['ended', true],
    ])
    expect(rendered.getChannelData(0)).toHaveLength(sampleRate * renderDuration)
    expect(rendered.getChannelData(0).some((sample) => Math.abs(sample) > audibleFloor)).toBe(true)
    expect(voice?.finished).toBe(true)
    voice?.play(afterEnd, true)
    expect(voice?.finished).toBe(true)
    voice?.stop()
    expect(voice?.finished).toBe(false)
  } finally {
    voice?.dispose()
    rendered?.dispose()
    const context = tone.getContext()
    if (context instanceof tone.Context) {
      await context.close()
    }
    context.dispose()
    URL.revokeObjectURL(source)
  }
})
