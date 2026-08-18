import {createSignal, getOwner, onCleanup, runWithOwner} from 'solid-js'

import type {ChatVoiceController, ChatVoiceState, UseChatVoiceProps} from './index'

const UNPREPARED_STATE: ChatVoiceState = {status: 'unprepared'}

/** Defers the complete Supertonic voice graph until speech preparation is requested. */
export const useLazyChatVoice = (props: UseChatVoiceProps = {}): ChatVoiceController => {
  const owner = getOwner()
  const [version, setVersion] = createSignal(0)
  let controller: ChatVoiceController | null = null
  let loading: Promise<ChatVoiceController> | null = null
  let disposed = false

  const current = () => {
    version()
    return controller
  }
  const load = () => {
    if (loading === null) {
      loading = import('./index')
        .then(({useChatVoice}) => {
          if (disposed) {
            throw new DOMException('Voice runtime was disposed.', 'AbortError')
          }

          const nextController = runWithOwner(owner, () => useChatVoice(props))

          if (nextController === undefined) {
            throw new Error('Voice runtime could not attach to the current reactive owner.')
          }

          controller = nextController
          setVersion((currentVersion) => currentVersion + 1)
          return nextController
        })
        .catch((error: unknown) => {
          loading = null
          throw error
        })
    }

    return loading
  }

  onCleanup(() => {
    disposed = true
    controller?.stop()
  })

  return {
    activeViseme: () => current()?.activeViseme() ?? 'rest',
    arm: () => current()?.arm(),
    canPrepare: () => current()?.canPrepare() ?? true,
    finish: () => current()?.finish() ?? Promise.resolve(),
    isGenerating: () => current()?.isGenerating() ?? false,
    isPlaying: () => current()?.isPlaying() ?? false,
    prepare: async () => (await load()).prepare(),
    speak: async (text, voiceId) => (await load()).speak(text, voiceId),
    state: () => current()?.state() ?? UNPREPARED_STATE,
    statusMessage: () =>
      current()?.statusMessage() ?? '채팅 모델과 함께 답변 음성 모델을 준비해 주세요.',
    stop: () => current()?.stop(),
  }
}
