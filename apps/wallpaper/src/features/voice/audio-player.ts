import type {VoiceAudio} from './synthesis'
import {createPlaybackMeter} from './create-playback-meter'

/** Schedules chunks on one audio clock with no inserted silence; abort removes queued audio. */
const PERCENT = 100
export const createAudioPlayer = (onLevel?: (level: number) => void) => {
  let context: AudioContext | null = null
  let nextStart = 0
  let disposed = false
  const stops = new Set<() => void>()
  const meter =
    onLevel === undefined
      ? null
      : createPlaybackMeter({clock: () => context?.currentTime ?? 0, onLevel})
  const enqueue = async (
    audio: VoiceAudio,
    volume: number,
    signal: AbortSignal,
    speed = 1,
  ): Promise<void> => {
    signal.throwIfAborted()
    if (disposed) {
      throw new DOMException('Cancelled', 'AbortError')
    }
    const runtime = context ?? new AudioContext({sampleRate: audio.sampleRate})
    context = runtime
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
      let stopMeter: (() => void) | undefined
      const clean = () => {
        stopMeter?.()
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
        clean()
        resolve()
      }
      runtime.resume().then(
        () => {
          if (signal.aborted || disposed) {
            return
          }
          const start = Math.max(runtime.currentTime, nextStart)
          nextStart = start + buffer.duration / speed
          try {
            started = true
            source.start(start)
            stopMeter = meter?.track(audio, start, speed)
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
      for (const stop of stops) {
        stop()
      }
      meter?.dispose()
      if (context !== null) {
        context.close().catch(() => undefined)
      }
      context = null
    },
    enqueue,
  }
}
