import type {LipSyncShape} from '@winter-love/wallpaper/settings/lipsync'
import {speechShapes} from './speech-shapes'
import {type Accessor, createEffect, createMemo, onCleanup} from 'solid-js'
import type {PoffoSpeech} from '@winter-love/wallpaper/settings/library-model'
import type {VoiceMessage} from '../voice/text'
import {createLipSyncPublisher} from './channel'

interface UseSpeechLipSyncProps {
  readonly widgetId: Accessor<string | undefined>
  readonly speech: Accessor<PoffoSpeech>
  readonly message: Accessor<VoiceMessage | null>
}
interface TextProgress {
  text: string
  offset: number
}
const CHARACTERS_PER_SECOND = 8
const MILLISECONDS_PER_SECOND = 1000
const TEXT_OPENING = 0.85
/** Drives the chosen input and remembers text already animated in each selected bubble. */
export const useSpeechLipSync = (props: UseSpeechLipSyncProps) => {
  const history = new Map<string, TextProgress>()
  let previousKey: string | null = null
  let previousTime: number | null = null
  const publisher = createMemo(() => {
    const id = props.widgetId()
    return id === undefined ? null : createLipSyncPublisher(id)
  })
  const mode = createMemo(() =>
    props.speech().enabled ? (props.speech().lipsync?.source ?? 'off') : 'off',
  )
  const message = createMemo(() => props.message(), null, {
    equals: (first, second) =>
      first?.chat === second?.chat && first?.id === second?.id && first?.text === second?.text,
  })
  createEffect(() => {
    const source = mode()
    const publish = publisher()
    const selected = message()
    if (publish === null || source === 'off') {
      previousKey = null
      previousTime = null
      return
    }
    let frame = 0
    onCleanup(() => {
      cancelAnimationFrame(frame)
      publish(source, 0)
    })
    publish(source, 0)
    if (source !== 'speech' || selected === null) {
      previousKey = null
      previousTime = null
      return
    }
    const key = `${selected.chat}:${selected.id}`
    const previous = history.get(key)
    const progress =
      previous !== undefined && selected.text.startsWith(previous.text)
        ? previous
        : {offset: 0, text: selected.text}
    progress.text = selected.text
    history.set(key, progress)
    const characters = speechShapes(progress.text)
    let timestamp = previousKey === key ? previousTime : null
    previousKey = key
    const step = (time: number) => {
      frame = 0
      progress.offset +=
        timestamp === null
          ? 0
          : (Math.max(0, time - timestamp) / MILLISECONDS_PER_SECOND) * CHARACTERS_PER_SECOND
      timestamp = time
      previousTime = time
      const index = Math.floor(progress.offset)
      if (index >= characters.length) {
        progress.offset = characters.length
        previousTime = null
        publish('speech', 0)
        return
      }
      const shape = characters[index] ?? null
      const phase = progress.offset - index
      publish('speech', shape === null ? 0 : Math.sin(Math.PI * phase) * TEXT_OPENING, shape)
      frame = requestAnimationFrame(step)
    }
    if (progress.offset < characters.length) {
      frame = requestAnimationFrame(step)
    }
  })
  return {
    audioShape: (shape: LipSyncShape | null, level: number) => {
      if (mode() === 'voice') {
        publisher()?.('voice', message() === null ? 0 : level, message() === null ? null : shape)
      }
    },
  }
}
