import {getSupertonicModel} from '@winter-love/supertonic/model'
import {splitSpeechText} from '@winter-love/supertonic/text-chunking'
import type {PoffoVoice} from '@winter-love/wallpaper/settings/voice'
import type {VoiceAudio, VoiceOutput} from './synthesis'
import {readChunks} from './read-chunks'
import type {VoiceMessage} from './text'
import type {VoicePlayback} from './types'
import {segmentText} from '../semantics/segment-text'

export type VoiceStatus = 'idle' | 'download' | 'generating' | 'playing' | 'buffering' | 'paused'
export interface VoiceReadoutPort {
  readonly stop?: () => void
  readonly prepare: (
    text: string,
    voice: PoffoVoice,
    signal: AbortSignal,
    observer: VoiceOutput,
  ) => Promise<VoiceAudio>
  /** Schedules audio; onStart fires on the playback clock and never delays playback. */
  readonly play: (
    audio: VoiceAudio,
    voice: PoffoVoice,
    signal: AbortSignal,
    onStart?: () => void,
  ) => Promise<void>
  readonly dispose: () => void
  readonly setPaused: (paused: boolean) => Promise<void>
}
interface ReadoutOptions {
  readonly port: VoiceReadoutPort
  readonly onStatus: (status: VoiceStatus) => void
  readonly onError: (cause: unknown) => void
  /** Reports the text actually playing and clears on stop; omitted disables position reporting. */
  readonly onPlayback?: (playback: VoicePlayback | null) => void
}
interface Reading extends VoiceMessage {
  text: string
  complete?: boolean
  offset: number
}
interface SpeechChunk {
  readonly reading: Reading
  readonly text: string
  readonly end: number
  readonly start: number
}
const nextChunk = (
  pending: Reading[],
  reserved: Map<Reading, number>,
  voice: PoffoVoice,
): SpeechChunk | null => {
  while (pending.length > 0) {
    const [reading] = pending
    const offset = reserved.get(reading) ?? reading.offset
    const segment = segmentText(reading).find((item) => item.end > offset)
    const rest = reading.text.slice(offset, segment?.end)
    const [text] = splitSpeechText(rest, getSupertonicModel(voice.model).speechPolicy)
    if (text) {
      const end = offset + Math.max(0, rest.indexOf(text)) + text.length
      const start = end - text.length
      reserved.set(reading, end)
      return {end, reading, start, text}
    }
    pending.shift()
  }
  return null
}

const createPlaybackControl = (options: ReadoutOptions) => {
  let paused = false
  let phase: VoiceStatus = 'idle'
  let control = 0
  const publish = (status: VoiceStatus) => {
    phase = status
    options.onStatus(paused ? 'paused' : status)
  }
  const resetPause = () => {
    control += 1
    const revision = control
    if (paused) {
      paused = false
      options.port.setPaused(false).catch((cause: unknown) => {
        if (control === revision) {
          options.onError(cause)
        }
      })
    }
  }
  return {
    reset: () => {
      resetPause()
      publish('idle')
    },
    status: publish,
    toggle: async () => {
      const previous = paused
      control += 1
      const revision = control
      paused = !previous
      publish(phase)
      try {
        await options.port.setPaused(paused)
      } catch (cause) {
        if (control === revision) {
          paused = previous
          publish(phase)
          throw cause
        }
      }
    },
  }
}

/** Pipelines selected-chat prose independently of ordered playback. */
export const createReadout = (options: ReadoutOptions) => {
  const history = new Map<string, Reading[]>()
  let current: {message: VoiceMessage; voice: PoffoVoice} | null = null
  let pending: Reading[] = []
  let active: AbortController | null = null
  const changes = new EventTarget()
  let disposed = false
  const playback = createPlaybackControl({
    ...options,
    onError: (cause) => {
      if (!disposed) {
        options.onError(cause)
      }
    },
  })
  const stop = () => {
    active?.abort()
    active = null
    options.port.stop?.()
    changes.dispatchEvent(new Event('change'))
    playback.reset()
    options.onPlayback?.(null)
  }
  const drain = async () => {
    if (active !== null || current === null || disposed) {
      return
    }
    const controller = new AbortController()
    active = controller
    const reserved = new Map<Reading, number>()
    try {
      await readChunks({
        changes,
        controller,
        next: () => {
          const selection = current
          if (selection === null) {
            return null
          }
          const chunk = nextChunk(pending, reserved, selection.voice)
          return chunk === null
            ? null
            : {
                completed: () => {
                  chunk.reading.offset = Math.max(chunk.reading.offset, chunk.end)
                },
                started: () => {
                  if (active === controller) {
                    const {offset: _offset, ...message} = chunk.reading
                    options.onPlayback?.({message, offset: chunk.start})
                  }
                },
                text: chunk.text,
                voice: selection.voice,
              }
        },
        onError: options.onError,
        onStatus: (status) => {
          if (active === controller) {
            playback.status(status)
          }
        },
        port: options.port,
      })
    } finally {
      if (active === controller) {
        active = null
        playback.reset()
        options.onPlayback?.(null)
      }
    }
  }
  const update = (message: VoiceMessage | null, voice: PoffoVoice) => {
    if (disposed) {
      return
    }
    if (message === null || !voice.enabled) {
      current = null
      pending = []
      stop()
      return
    }
    const key = `${message.chat}:${message.id}`
    const entries = history.get(key) ?? []
    const previous = entries.at(-1)
    const reading =
      entries.find((item) => item.text === message.text) ??
      (previous && message.text.startsWith(previous.text) ? previous : {...message, offset: 0})
    reading.text = message.text
    reading.complete = message.complete
    if (!entries.includes(reading)) {
      entries.push(reading)
    }
    history.set(key, entries)
    const changed =
      current?.message.chat !== message.chat ||
      JSON.stringify(current?.voice) !== JSON.stringify(voice)
    current = {message, voice}
    if (changed) {
      stop()
      pending = [reading]
    } else if (!pending.includes(reading) && reading.offset < reading.text.length) {
      pending.push(reading)
    }
    changes.dispatchEvent(new Event('change'))
    drain().catch(options.onError)
  }
  return {
    dispose: () => {
      disposed = true
      current = null
      pending = []
      stop()
      options.port.dispose()
    },
    retry: () => {
      if (current === null || disposed) {
        return
      }
      const {message} = current
      stop()
      pending = (history.get(`${message.chat}:${message.id}`) ?? []).filter(
        (reading) => reading.offset < reading.text.length,
      )
      drain().catch(options.onError)
    },
    toggle: async () => {
      if (current === null || disposed) {
        return
      }
      if (active === null) {
        const {message} = current
        const reading = history
          .get(`${message.chat}:${message.id}`)
          ?.find((item) => item.text === message.text)
        if (reading !== undefined) {
          reading.offset = 0
          pending = [reading]
          drain().catch(options.onError)
        }
        return
      }
      await playback.toggle()
    },
    update,
  }
}
