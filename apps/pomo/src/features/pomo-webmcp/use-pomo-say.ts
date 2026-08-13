import {type Accessor, createEffect, createSignal, onCleanup, onMount} from 'solid-js'

import {useChatVoice} from '../chat-voice'
import {type PomoSayRequest, registerPomoSayTool} from './register-pomo-say-tool'

export interface UsePomoSayOptions {
  readonly onBeforeSpeech: () => void
}

export interface PomoSayController {
  readonly speechText: Accessor<string | null>
  readonly stop: () => void
}

const createCancelledError = () => new DOMException('Pomo speech was cancelled.', 'AbortError')

/** Registers and owns the cancellable WebMCP speech lifecycle for Pomo. */
export const usePomoSay = (options: UsePomoSayOptions): PomoSayController => {
  const [speechText, setSpeechText] = createSignal<string | null>(null)
  const voice = useChatVoice()
  let speechSession = 0

  const assertActive = (activeSession: number) => {
    if (activeSession !== speechSession) {
      throw createCancelledError()
    }
  }

  const speak = async (request: PomoSayRequest) => {
    speechSession += 1
    const activeSession = speechSession
    options.onBeforeSpeech()
    await voice.prepare()
    assertActive(activeSession)

    const preparedState = voice.state()

    if (preparedState.status === 'error') {
      throw new Error(preparedState.message)
    }

    voice.arm()
    const speech = voice.speak(request.text, request.voiceId)
    setSpeechText(request.text)
    await speech
    assertActive(activeSession)
    await voice.finish()
    assertActive(activeSession)

    const completedState = voice.state()

    if (completedState.status === 'error') {
      throw new Error(completedState.message)
    }
  }

  const stop = () => {
    speechSession += 1
    setSpeechText(null)
    voice.stop()
  }

  onMount(() => {
    const registration = new AbortController()
    registerPomoSayTool({document, signal: registration.signal, speak}).catch((error: unknown) => {
      console.error('Failed to register the Pomo WebMCP tool.', error)
    })

    onCleanup(() => {
      speechSession += 1
      registration.abort()
    })
  })

  createEffect(() => {
    const text = speechText()
    const speechState = voice.state()

    if (text !== null && speechState.status !== 'speaking') {
      setSpeechText(null)
    }
  })

  return {speechText, stop}
}
