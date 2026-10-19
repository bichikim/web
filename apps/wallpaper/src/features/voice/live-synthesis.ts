// oxlint-disable no-await-in-loop -- Retry failed utterances serially on fresh, independently disposed connections.
import type {SynthesisClient, VoiceAudio} from './synthesis'
import {generateLiveSpeech} from './live-session'
import {SpeechConnectionError} from './connection-error'

const ERRORS: Readonly<Record<string, string>> = {
  desktopOnly: 'ChatGPT 음성은 데스크톱 앱에서 사용할 수 있어요.',
  invalidRequest: '읽을 내용을 확인해 주세요.',
  loginRequired: 'Codex에서 로그인한 뒤 다시 시도해 주세요.',
  rateLimited: '음성 사용량이 많아요. 잠시 후 다시 시도해 주세요.',
  voiceSettings: 'ChatGPT 음성 설정을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.',
}
const FAILURES: Readonly<Record<string, string>> = {
  incomplete: 'ChatGPT 음성 생성이 끝나지 않았어요.',
  liveAttach: 'Codex 음성 제어 연결을 열지 못했어요.',
  liveSetup: 'Codex 음성 세션을 준비하지 못했어요.',
  network: 'ChatGPT 음성 연결이 지연되거나 끊겼어요.',
  silent: 'ChatGPT에서 무음 응답을 받았어요.',
}

/** Retries transient transport or silent output twice, preserving cancellation and the selected voice. */
export const createLiveSynthesis = (): SynthesisClient => {
  const requests = new Set<AbortController>()
  let disposed = false
  return {
    dispose: () => {
      disposed = true
      requests.forEach((request) => request.abort())
    },
    generate: async (text, voice, signal, observer) => {
      const {status} = observer
      const onAudio = observer.audio
      signal.throwIfAborted()
      if (disposed) {
        throw new DOMException('Cancelled', 'AbortError')
      }
      const controller = new AbortController()
      const abort = () => controller.abort(signal.reason)
      signal.addEventListener('abort', abort, {once: true})
      requests.add(controller)
      let streamed = false
      const receive =
        onAudio === undefined
          ? undefined
          : (audio: VoiceAudio) => {
              controller.signal.throwIfAborted()
              streamed = true
              onAudio(audio)
            }
      try {
        const MAXIMUM_ATTEMPTS = 3
        for (let attempt = 0; attempt < MAXIMUM_ATTEMPTS; attempt += 1) {
          controller.signal.throwIfAborted()
          status('generating')
          controller.signal.throwIfAborted()
          try {
            const audio = await generateLiveSpeech(text, controller.signal, voice.language, receive)
            controller.signal.throwIfAborted()
            return audio
          } catch (cause) {
            controller.signal.throwIfAborted()
            const code = cause instanceof SpeechConnectionError ? cause.code : cause
            const message = typeof code === 'string' ? ERRORS[code] : undefined
            if (message !== undefined) {
              throw new Error(message, {cause})
            }
            if (streamed || attempt === MAXIMUM_ATTEMPTS - 1) {
              const detail = typeof code === 'string' ? FAILURES[code] : undefined
              throw new Error(
                `${detail ?? 'ChatGPT 음성을 받지 못했어요.'} 다시 읽기를 눌러 주세요.`,
                {cause},
              )
            }
          }
        }
        throw new Error('ChatGPT 음성을 받지 못했어요.')
      } finally {
        signal.removeEventListener('abort', abort)
        requests.delete(controller)
      }
    },
  }
}
