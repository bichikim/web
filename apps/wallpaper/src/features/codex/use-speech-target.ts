import {createEffect, createSignal, onCleanup} from 'solid-js'
import {invoke, isTauri} from '@tauri-apps/api/core'
import {listen} from '@tauri-apps/api/event'
import type {CodexSpeechTarget} from './types'

export const useSpeechTarget = () => {
  const [target, setTarget] = createSignal<CodexSpeechTarget>()
  createEffect(() => {
    if (!isTauri()) {
      return
    }
    let disposed = false
    let revision = 0
    let stop: (() => void) | null = null
    const receive = (point: CodexSpeechTarget) => {
      if (!disposed) {
        revision += 1
        setTarget(point)
      }
    }
    listen<CodexSpeechTarget>('poffo-speech-target', (event) => receive(event.payload))
      .then(async (unsubscribe) => {
        if (disposed) {
          unsubscribe()
          return
        }
        stop = unsubscribe
        const initial = revision
        const point = await invoke<CodexSpeechTarget | null>('poffo_speech_target')
        if (!disposed && revision === initial && point !== null) {
          setTarget(point)
        }
      })
      .catch((cause: unknown) => console.error('Poffo speech position unavailable', cause))
    onCleanup(() => {
      disposed = true
      stop?.()
    })
  })
  return target
}
