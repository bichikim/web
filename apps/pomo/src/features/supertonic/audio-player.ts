import {
  createPAudioEnvelope,
  createPVisemeDriver,
  createPVisemeTrack,
  getPAudioEnvelopeLevel,
  getPCoarticulatedVisemeAtTime,
  type PAudioEnvelope,
  type PViseme,
  type PVisemeCue,
} from '../lip-sync'
import {createPBrowserAudioVisemeAnalyzer} from '../lip-sync/browser-audio-viseme'
import type {SupertonicAudio} from './messages'

export interface SupertonicAudioPlayer {
  readonly dispose: () => void
  readonly enqueue: (audio: SupertonicAudio, silenceDuration: number, text?: string) => void
  readonly finish: () => void
}

export interface CreateSupertonicAudioPlayerOptions {
  readonly onPlaybackEnd?: () => void
  readonly onVisemeChange?: (viseme: PViseme) => void
}

interface ScheduledVisemeTrack {
  readonly cues: ReadonlyArray<PVisemeCue>
  readonly endTime: number
  readonly envelope: PAudioEnvelope
  readonly startTime: number
}

const MILLISECONDS_PER_SECOND = 1000
const REST_RETURN_DELAY_MS = 300

/** Creates a click-activated Web Audio queue that plays generated chunks in order. */
export const createSupertonicAudioPlayer = (
  options: CreateSupertonicAudioPlayerOptions = {},
): SupertonicAudioPlayer => {
  const context = new AudioContext()
  const audioVisemeAnalyzer = createPBrowserAudioVisemeAnalyzer(context)
  const sources = new Set<AudioBufferSourceNode>()
  const visemeTracks: Array<ScheduledVisemeTrack> = []
  const visemeDriver = createPVisemeDriver()
  let animationFrame: number | null = null
  let activeViseme: PViseme = 'rest'
  let finished = false
  let playbackEndReported = false
  let restReturnTimer: number | null = null
  let nextStartTime = context.currentTime

  const setViseme = (viseme: PViseme) => {
    if (viseme === activeViseme) {
      return
    }

    activeViseme = viseme
    options.onVisemeChange?.(viseme)
  }

  const cancelRestReturn = () => {
    if (restReturnTimer !== null) {
      window.clearTimeout(restReturnTimer)
      restReturnTimer = null
    }
  }

  const scheduleRestReturn = () => {
    cancelRestReturn()
    restReturnTimer = window.setTimeout(() => {
      restReturnTimer = null
      setViseme('rest')
    }, REST_RETURN_DELAY_MS)
  }

  const updateViseme = () => {
    const {currentTime} = context
    const track = visemeTracks.find(
      (candidate) => currentTime >= candidate.startTime && currentTime < candidate.endTime,
    )
    const trackTimeMs =
      track === undefined ? 0 : (currentTime - track.startTime) * MILLISECONDS_PER_SECOND
    if (track !== undefined) {
      const textViseme = getPCoarticulatedVisemeAtTime(track.cues, trackTimeMs)
      const audioFrame = audioVisemeAnalyzer.getFrame(textViseme)
      const nextViseme = visemeDriver.update({
        currentTimeMs: currentTime * MILLISECONDS_PER_SECOND,
        intensity: audioFrame?.intensity ?? getPAudioEnvelopeLevel(track.envelope, trackTimeMs),
        viseme: audioFrame?.viseme ?? textViseme,
      })

      if (nextViseme !== 'rest') {
        setViseme(nextViseme)
      }
    }

    if (!finished || sources.size > 0) {
      animationFrame = window.requestAnimationFrame(updateViseme)
    } else {
      animationFrame = null
    }
  }

  const startVisemeClock = () => {
    if (animationFrame === null && options.onVisemeChange !== undefined) {
      animationFrame = window.requestAnimationFrame(updateViseme)
    }
  }

  const closeIfFinished = () => {
    if (finished && sources.size === 0 && context.state !== 'closed') {
      context.close().catch(() => undefined)
    }

    if (finished && sources.size === 0 && !playbackEndReported) {
      playbackEndReported = true
      scheduleRestReturn()
      options.onPlaybackEnd?.()
    }
  }

  const enqueue = (audio: SupertonicAudio, silenceDuration: number, text = '') => {
    cancelRestReturn()
    const buffer = context.createBuffer(1, audio.samples.length, audio.sampleRate)
    buffer.copyToChannel(new Float32Array(audio.samples), 0)
    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(context.destination)
    audioVisemeAnalyzer.connect(source).catch(() => undefined)
    sources.add(source)
    source.addEventListener('ended', () => {
      sources.delete(source)
      closeIfFinished()
    })
    const startTime = Math.max(context.currentTime, nextStartTime)
    source.start(startTime)
    nextStartTime = startTime + buffer.duration + silenceDuration
    visemeTracks.push({
      cues: createPVisemeTrack({durationMs: buffer.duration * MILLISECONDS_PER_SECOND, text}),
      endTime: startTime + buffer.duration,
      envelope: createPAudioEnvelope({sampleRate: audio.sampleRate, samples: audio.samples}),
      startTime,
    })
    startVisemeClock()
  }

  const finish = () => {
    finished = true
    closeIfFinished()
  }

  const dispose = () => {
    for (const source of sources) {
      source.stop()
    }

    sources.clear()
    visemeTracks.length = 0
    visemeDriver.reset()
    cancelRestReturn()

    if (animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame)
      animationFrame = null
    }

    setViseme('rest')
    audioVisemeAnalyzer.dispose()

    if (context.state !== 'closed') {
      context.close().catch(() => undefined)
    }
  }

  context.resume().catch(() => undefined)
  return {dispose, enqueue, finish}
}
