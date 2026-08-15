import {type Accessor, createSignal, onCleanup, onMount} from 'solid-js'

import {useChatVoice} from '../chat-voice'
import {type PSayRequest, registerPSayTool} from './register-pomo-say-tool'

export interface UsePSayProps {
  readonly onBeforeSpeech: () => void
}

export type UsePSayOptions = UsePSayProps

export interface PSayController {
  readonly speechText: Accessor<string | null>
  readonly stop: () => void
}

const createCancelledError = () => new DOMException('Pomo speech was cancelled.', 'AbortError')

/** Registers and owns the cancellable WebMCP speech lifecycle for Pomo. */
export const usePSay = (props: UsePSayProps): PSayController => {
  const [speechText, setSpeechText] = createSignal<string | null>(null)
  const voice = useChatVoice()
  let speechSession = 0

  const assertActive = (activeSession: number) => {
    if (activeSession !== speechSession) {
      throw createCancelledError()
    }
  }

  const speak = async (request: PSayRequest) => {
    speechSession += 1
    const activeSession = speechSession
    setSpeechText(request.text)

    try {
      props.onBeforeSpeech()
      await voice.prepare()
      assertActive(activeSession)

      const preparedState = voice.state()

      if (preparedState.status === 'error') {
        throw new Error(preparedState.message)
      }

      voice.arm()
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
        setSpeechText(null)
      }
    }
  }

  const stop = () => {
    speechSession += 1
    setSpeechText(null)
    voice.stop()
  }

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

  return {speechText, stop}
}
