import captureUrl from './capture.worklet.ts?worker&url'
import type {VoiceAudio} from './synthesis'
import {type ConnectionFailure, SpeechConnectionError} from './connection-error'

const AUDIBLE_AMPLITUDE = 0.002
const TRAILING_SECONDS = 0.5
const MAXIMUM_SECONDS = 90
const START_TIMEOUT = 12_000
const MILLISECONDS = 1000
const MINIMUM_SECONDS = 0.05
const LEADING_SECONDS = 0.01
const PADDING_SECONDS = 0.02

/** Captures received speech without playing prefetched audio; rejects silent and incomplete output. */
export const captureAudio = async (
  context: AudioContext,
  stream: MediaStream,
  signal: AbortSignal,
  onAudio?: (audio: VoiceAudio) => void,
) => {
  await context.audioWorklet.addModule(captureUrl)
  signal.throwIfAborted()
  const input = context.createMediaStreamSource(stream)
  const processor = new AudioWorkletNode(context, 'poffo-speech-capture')
  input.connect(processor).connect(context.destination)
  const chunks: Float32Array[] = []
  let started = false
  let audible = false
  let ended = false
  let silence = 0
  let length = 0
  let minimumFrames = 0
  let buffered = new Float32Array(0)
  let streaming = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const {promise: audio, resolve, reject} = Promise.withResolvers<VoiceAudio>()
  const abort = () => reject(signal.reason)
  signal.addEventListener('abort', abort, {once: true})
  const deadline = (milliseconds: number, cause: ConnectionFailure) => {
    clearTimeout(timer)
    timer = setTimeout(
      () => reject(new SpeechConnectionError(cause, {audible, ended, length})),
      milliseconds,
    )
  }
  const finish = () => {
    const samples = new Float32Array(length)
    let offset = 0
    for (const chunk of chunks) {
      samples.set(chunk, offset)
      offset += chunk.length
    }
    const first = samples.findIndex((sample) => Math.abs(sample) > AUDIBLE_AMPLITUDE)
    const last = samples.findLastIndex((sample) => Math.abs(sample) > AUDIBLE_AMPLITUDE)
    if (first < 0 || last - first < context.sampleRate * MINIMUM_SECONDS) {
      reject(new SpeechConnectionError('silent'))
      return
    }
    resolve({
      sampleRate: context.sampleRate,
      samples: samples.slice(
        Math.max(0, first - context.sampleRate * LEADING_SECONDS),
        last + context.sampleRate * PADDING_SECONDS,
      ),
    })
  }
  processor.port.onmessage = (event: MessageEvent<{samples: Float32Array}>) => {
    if (!started || signal.aborted) {
      return
    }
    const {samples} = event.data
    chunks.push(samples)
    length += samples.length
    const energy = samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length
    if (energy > AUDIBLE_AMPLITUDE ** 2) {
      if (!audible) {
        audible = true
        deadline(MAXIMUM_SECONDS * MILLISECONDS, 'incomplete')
      }
      silence = 0
    } else {
      silence += samples.length
    }
    if (onAudio !== undefined && audible) {
      const pending = new Float32Array(buffered.length + samples.length)
      pending.set(buffered)
      pending.set(samples, buffered.length)
      buffered = pending
      const START_BUFFER_SECONDS = 0.2
      if (streaming || buffered.length >= context.sampleRate * START_BUFFER_SECONDS) {
        streaming = true
        onAudio({sampleRate: context.sampleRate, samples: buffered})
        buffered = new Float32Array(0)
      }
    }
    if (
      audible &&
      ended &&
      length >= minimumFrames &&
      silence >= context.sampleRate * TRAILING_SECONDS
    ) {
      finish()
    }
    if (length > context.sampleRate * MAXIMUM_SECONDS) {
      reject(new SpeechConnectionError('incomplete'))
    }
  }
  return {
    audio,
    begin: () => {
      started = true
      deadline(START_TIMEOUT, 'silent')
    },
    complete: (endMilliseconds = 0) => {
      ended = true
      minimumFrames = (context.sampleRate * endMilliseconds) / MILLISECONDS
      if (audible && length >= minimumFrames && silence >= context.sampleRate * TRAILING_SECONDS) {
        finish()
      }
    },
    dispose: () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', abort)
      processor.port.onmessage = null
      processor.port.close()
      input.disconnect()
      processor.disconnect()
    },
  }
}
