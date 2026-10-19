import {getSupertonicModel} from '@winter-love/supertonic/model'
import {splitSpeechText} from '@winter-love/supertonic/text-chunking'
import type {PoffoVoice} from '@winter-love/wallpaper/settings/voice'
import type {VoiceAudio, VoiceOutput} from './synthesis'
import {readChunks} from './read-chunks'
import type {VoiceMessage} from './text'

export type VoiceStatus = 'idle' | 'download' | 'generating' | 'playing' | 'buffering'
export interface VoiceReadoutPort {
  readonly prepare: (
    text: string,
    voice: PoffoVoice,
    signal: AbortSignal,
    observer: VoiceOutput,
  ) => Promise<VoiceAudio>
  readonly play: (audio: VoiceAudio, voice: PoffoVoice, signal: AbortSignal) => Promise<void>
  readonly dispose: () => void
}
interface ReadoutOptions {
  readonly port: VoiceReadoutPort
  readonly onStatus: (status: VoiceStatus) => void
  readonly onError: (cause: unknown) => void
}
interface Reading {
  text: string
  offset: number
}
interface SpeechChunk {
  readonly reading: Reading
  readonly text: string
  readonly end: number
}
const nextChunk = (
  pending: Reading[],
  reserved: Map<Reading, number>,
  voice: PoffoVoice,
): SpeechChunk | null => {
  while (pending.length > 0) {
    const [reading] = pending
    const offset = reserved.get(reading) ?? reading.offset
    const rest = reading.text.slice(offset)
    const [text] = splitSpeechText(rest, getSupertonicModel(voice.model).speechPolicy)
    if (text) {
      const end = offset + Math.max(0, rest.indexOf(text)) + text.length
      reserved.set(reading, end)
      return {end, reading, text}
    }
    pending.shift()
  }
  return null
}

/** Pipelines selected-chat prose independently of ordered playback. */
export const createReadout = (options: ReadoutOptions) => {
  const history = new Map<string, Reading[]>()
  let current: {message: VoiceMessage; voice: PoffoVoice} | null = null
  let pending: Reading[] = []
  let active: AbortController | null = null
  const changes = new EventTarget()
  let disposed = false
  const stop = () => {
    active?.abort()
    active = null
    changes.dispatchEvent(new Event('change'))
    options.onStatus('idle')
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
                text: chunk.text,
                voice: selection.voice,
              }
        },
        onError: options.onError,
        onStatus: (status) => {
          if (active === controller) {
            options.onStatus(status)
          }
        },
        port: options.port,
      })
    } finally {
      if (active === controller) {
        active = null
        options.onStatus('idle')
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
      (previous && message.text.startsWith(previous.text)
        ? previous
        : {offset: 0, text: message.text})
    reading.text = message.text
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
    update,
  }
}
