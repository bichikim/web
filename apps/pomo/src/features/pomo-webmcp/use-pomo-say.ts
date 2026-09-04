import {type Accessor, createEffect, createSignal, onCleanup, onMount} from 'solid-js'

import {useLazyChatVoice} from '../chat-voice/lazy'
import type {PViseme} from '../lip-sync'
import {type PSayRequest, registerPSayTool} from './register-pomo-say-tool'

export interface UsePSayProps {
  readonly onBeforeSpeech: () => void
}

export type UsePSayOptions = UsePSayProps

export interface PSayController {
  readonly activeViseme: Accessor<PViseme>
  readonly isPlaying: Accessor<boolean>
  readonly isPreparing: Accessor<boolean>
  readonly speak: (request: PSayRequest) => Promise<void>
  readonly speechText: Accessor<string | null>
  readonly stop: () => void
}

const createCancelledError = () => new DOMException('Pomo speech was cancelled.', 'AbortError')

/** Registers and owns the cancellable WebMCP speech lifecycle for Pomo. */
export const usePSay = (props: UsePSayProps): PSayController => {
  const [speechText, setSpeechText] = createSignal<string | null>(null)
  const [pendingSpeechText, setPendingSpeechText] = createSignal<string | null>(null)
  const [isPreparing, setIsPreparing] = createSignal(false)
  const voice = useLazyChatVoice()
  let speechSession = 0

  const assertActive = (activeSession: number) => {
    if (activeSession !== speechSession) {
      throw createCancelledError()
    }
  }

  const speak = async (request: PSayRequest) => {
    speechSession += 1
    const activeSession = speechSession
    setIsPreparing(true)
    setPendingSpeechText(null)
    setSpeechText(null)

    try {
      props.onBeforeSpeech()
      await voice.prepare()
      assertActive(activeSession)

      const preparedState = voice.state()

      if (preparedState.status === 'error') {
        throw new Error(preparedState.message)
      }

      voice.arm()
      setPendingSpeechText(request.text)
      const speech = voice.speak(request.text, request.voiceId)
      await speech
      assertActive(activeSession)
      await voice.finish()
      assertActive(activeSession)

      const completedState = voice.state()

      if (completedState.status === 'error') {
        throw new Error(completedState.message)
      }
    } finally {
      if (activeSession === speechSession) {
        setIsPreparing(false)
        setPendingSpeechText(null)
        setSpeechText(null)
      }
    }
  }

  const stop = () => {
    speechSession += 1
    setIsPreparing(false)
    setPendingSpeechText(null)
    setSpeechText(null)
    voice.stop()
  }

  createEffect(() => {
    const pendingText = pendingSpeechText()

    if (pendingText === null || !voice.isPlaying()) {
      return
    }

    setPendingSpeechText(null)
    setSpeechText(pendingText)
    setIsPreparing(false)
  })

  onMount(() => {
    const registration = new AbortController()
    registerPSayTool({document, signal: registration.signal, speak}).catch((error: unknown) => {
      console.error('Failed to register the Pomo WebMCP tool.', error)
    })

    onCleanup(() => {
      speechSession += 1
      registration.abort()
    })
  })

  return {
    activeViseme: voice.activeViseme,
    isPlaying: voice.isPlaying,
    isPreparing,
    speak,
    speechText,
    stop,
  }
}
