import type {LipSyncOutput} from '../lipsync/types'
import type {VoiceAudio} from './synthesis'
import {createPlaybackMeter} from './create-playback-meter'

interface AudioPlaybackOptions {
  /** Playback multiplier; omission uses the generated audio's original speed. */
  readonly speed?: number
  /** Fires on the audio clock when this clip becomes audible; omitted disables the callback. */
  readonly onStart?: () => void
  /** Fires after scheduling the source, without waiting for the clip to become audible. */
  readonly onScheduled?: () => void
}

/** Schedules chunks on one audio clock with no inserted silence; abort removes queued audio. */
const PERCENT = 100
export const createAudioPlayer = (
  onLevel?: (level: number) => void,
  onShape?: LipSyncOutput,
  enabled?: () => boolean,
) => {
  let context: AudioContext | null = null
  let nextStart = 0
  let disposed = false
  let paused = false
  let control = 0
  const stops = new Set<() => void>()
  const createMeter = () =>
    createPlaybackMeter({
      clock: () => context?.currentTime ?? 0,
      enabled,
      onLevel: (level) => onLevel?.(level),
      onShape,
    })
  let meter = onLevel === undefined && onShape === undefined ? null : createMeter()
  const stop = () => {
    for (const stop of stops) {
      stop()
    }
    meter?.stop()
  }
  const enqueue = async (
    audio: VoiceAudio,
    volume: number,
    signal: AbortSignal,
    options: AudioPlaybackOptions = {},
  ): Promise<void> => {
    const speed = options.speed ?? 1
    const {onStart} = options
    signal.throwIfAborted()
    if (disposed) {
      throw new DOMException('Cancelled', 'AbortError')
    }
    const runtime = context ?? new AudioContext({sampleRate: audio.sampleRate})
    context = runtime
    if (onStart !== undefined) {
      meter ??= createMeter()
    }
    const source = runtime.createBufferSource()
    const gain = runtime.createGain()
    const buffer = runtime.createBuffer(1, audio.samples.length, audio.sampleRate)
    buffer.copyToChannel(new Float32Array(audio.samples), 0)
    source.buffer = buffer
    source.playbackRate.value = speed
    gain.gain.value = volume / PERCENT
    source.connect(gain).connect(runtime.destination)
    await new Promise<void>((resolve, reject) => {
      let started = false
      let stopMeter: ReturnType<ReturnType<typeof createPlaybackMeter>['track']> | undefined
      const clean = (reason: 'ended' | 'cancelled' = 'cancelled') => {
        stopMeter?.(reason)
        signal.removeEventListener('abort', abort)
        stops.delete(abort)
        source.onended = null
        source.disconnect()
        gain.disconnect()
        if (stops.size === 0) {
          nextStart = runtime.currentTime
        }
      }
      const abort = () => {
        if (started) {
          source.stop()
        }
        clean()
        reject(signal.reason ?? new DOMException('Cancelled', 'AbortError'))
      }
      stops.add(abort)
      signal.addEventListener('abort', abort, {once: true})
      source.onended = () => {
        clean('ended')
        resolve()
      }
      const ready = paused ? runtime.suspend() : runtime.resume()
      ready.then(
        () => {
          if (signal.aborted || disposed) {
            return
          }
          const start = Math.max(runtime.currentTime, nextStart)
          nextStart = start + buffer.duration / speed
          try {
            started = true
            source.start(start)
            stopMeter = meter?.track(audio, start, speed, onStart)
            options.onScheduled?.()
          } catch (cause) {
            clean()
            reject(cause)
          }
        },
        (cause: unknown) => {
          clean()
          reject(cause)
        },
      )
    })
  }
  return {
    dispose: () => {
      disposed = true
      stop()
      meter?.dispose()
      if (context !== null) {
        context.close().catch(() => undefined)
      }
      context = null
    },
    enqueue,
    setPaused: async (value: boolean) => {
      const previous = paused
      control += 1
      const revision = control
      paused = value
      meter?.setPaused(value)
      try {
        if (context !== null) {
          await (value ? context.suspend() : context.resume())
        }
      } catch (cause) {
        if (control === revision) {
          paused = previous
          meter?.setPaused(previous)
        }
        throw cause
      }
    },
    stop,
  }
}
