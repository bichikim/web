// oxlint-disable no-await-in-loop -- Generate chunks serially while playback proceeds independently.
import type {PoffoVoice} from '@winter-love/wallpaper/settings/voice'
import type {VoiceAudio} from './synthesis'
import type {VoiceReadoutPort, VoiceStatus} from './readout'

interface SpeechChunk {
  readonly completed: () => void
  readonly text: string
  readonly voice: PoffoVoice
}
interface PlaybackResult {
  readonly cause?: unknown
  readonly failed: boolean
}
interface ReadChunksOptions {
  readonly changes: EventTarget
  readonly controller: AbortController
  readonly next: () => SpeechChunk | null
  readonly onError: (cause: unknown) => void
  readonly onStatus: (status: VoiceStatus) => void
  readonly port: VoiceReadoutPort
}
const ignore = () => undefined

/** Generates pending chunks and schedules new arrivals without waiting for existing playback. */
export const readChunks = async (options: ReadChunksOptions) => {
  const {signal} = options.controller
  const queue: Promise<PlaybackResult>[] = []
  let audible = 0
  let preparing: VoiceStatus = 'idle'
  const publish = () => {
    if (!signal.aborted) {
      options.onStatus(audible > 0 ? (preparing === 'idle' ? 'playing' : 'buffering') : preparing)
    }
  }
  const fail = (cause: unknown) => {
    if (!signal.aborted) {
      options.controller.abort()
      options.onError(cause)
    }
  }
  const setPreparation = (value: VoiceStatus) => {
    preparing = value
    publish()
  }
  const complete = async () => {
    const result = await queue.shift()!
    if (result.failed) {
      throw result.cause
    }
  }
  const schedule = (voice: PoffoVoice, audio: VoiceAudio) => {
    preparing = 'idle'
    audible += 1
    const played = options.port
      .play(audio, voice, signal)
      .then(
        () => ({failed: false}),
        (cause: unknown) => {
          fail(cause)
          return {cause, failed: true}
        },
      )
      .finally(() => {
        audible -= 1
        publish()
      })
    publish()
    return played
  }
  const prepare = async (chunk: SpeechChunk) => {
    const playback: Promise<PlaybackResult>[] = []
    const receive = (audio: VoiceAudio) => {
      signal.throwIfAborted()
      playback.push(schedule(chunk.voice, audio))
    }
    setPreparation('generating')
    const audio = await options.port.prepare(chunk.text, chunk.voice, signal, {
      audio: receive,
      status: setPreparation,
    })
    signal.throwIfAborted()
    if (playback.length === 0) {
      receive(audio)
    }
    queue.push(
      Promise.all(playback).then((results) => {
        const failure = results.find((result) => result.failed)
        if (failure !== undefined) {
          return failure
        }
        if (!signal.aborted) {
          chunk.completed()
        }
        return {failed: false}
      }),
    )
  }
  const waitForInput = async () => {
    let wake: () => void = ignore
    const changed = new Promise<'changed'>((resolve) => {
      wake = () => resolve('changed')
    })
    options.changes.addEventListener('change', wake, {once: true})
    signal.addEventListener('abort', wake, {once: true})
    try {
      const result = await Promise.race([queue[0].then(() => 'played' as const), changed])
      if (result === 'played') {
        await complete()
      }
    } finally {
      options.changes.removeEventListener('change', wake)
      signal.removeEventListener('abort', wake)
    }
  }
  try {
    while (!signal.aborted) {
      signal.throwIfAborted()
      const chunk = options.next()
      if (chunk !== null) {
        await prepare(chunk)
      } else if (queue.length > 0) {
        await waitForInput()
      } else {
        return
      }
    }
  } catch (cause) {
    fail(cause)
  }
}
