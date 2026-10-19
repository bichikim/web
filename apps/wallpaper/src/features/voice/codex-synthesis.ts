import {Channel, invoke, isTauri} from '@tauri-apps/api/core'
import type {SynthesisClient} from './synthesis'

const ERRORS: Readonly<Record<string, string>> = {
  cancelled: '음성 생성을 중지했어요.',
  desktopOnly: 'Codex 음성은 데스크톱 앱에서 사용할 수 있어요.',
  invalidRequest: '읽을 내용이나 언어를 확인해 주세요.',
  loginRequired: 'Codex에서 로그인한 뒤 다시 시도해 주세요.',
  network: 'Codex 음성 서비스에 연결할 수 없어요.',
  rateLimited: 'Codex 음성 사용량이 많아요. 잠시 후 다시 시도해 주세요.',
  unavailable: 'Codex 음성 서비스를 사용할 수 없어요.',
}

/** Decodes native Codex speech without exposing account credentials to the webview. */
export const createCodexSynthesis = (): SynthesisClient => {
  let context: AudioContext | null = null
  let disposed = false
  const requests = new Set<AbortController>()
  return {
    dispose: () => {
      disposed = true
      requests.forEach((request) => request.abort())
      context?.close().catch(() => undefined)
      context = null
    },
    generate: async (text, voice, signal, observer) => {
      const {status} = observer
      signal.throwIfAborted()
      if (disposed) {
        throw new DOMException('Cancelled', 'AbortError')
      }
      if (!isTauri()) {
        throw new Error(ERRORS['desktopOnly'])
      }
      const requestId = crypto.randomUUID()
      const request = new AbortController()
      requests.add(request)
      const cancelNative = () => {
        invoke('cancel_codex_voice', {requestId}).catch(() => undefined)
      }
      const abort = () => request.abort(signal.reason)
      signal.addEventListener('abort', abort, {once: true})
      const started = new Channel<null>()
      // Native acknowledgement closes the cancel-before-registration race.
      started.onmessage = () => {
        if (request.signal.aborted) {
          cancelNative()
        }
      }
      let rejectAbort: (() => void) | null = null
      try {
        status('generating')
        request.signal.throwIfAborted()
        const cancelled = new Promise<never>((_, reject) => {
          rejectAbort = () => {
            cancelNative()
            reject(request.signal.reason ?? new DOMException('Cancelled', 'AbortError'))
          }
          request.signal.addEventListener('abort', rejectAbort, {once: true})
        })
        const bytes = await Promise.race([
          invoke<ArrayBuffer>('synthesize_codex_voice', {
            language: voice.language,
            requestId,
            started,
            text,
          }),
          cancelled,
        ])
        request.signal.throwIfAborted()
        const decoder = context ?? new AudioContext({sampleRate: 24_000})
        context = decoder
        const audio = await Promise.race([decoder.decodeAudioData(bytes), cancelled])
        request.signal.throwIfAborted()
        return {sampleRate: audio.sampleRate, samples: new Float32Array(audio.getChannelData(0))}
      } catch (cause) {
        request.signal.throwIfAborted()
        throw new Error(
          typeof cause === 'string' ? (ERRORS[cause] ?? ERRORS.unavailable) : ERRORS.unavailable,
          {cause},
        )
      } finally {
        signal.removeEventListener('abort', abort)
        if (rejectAbort !== null) {
          request.signal.removeEventListener('abort', rejectAbort)
        }
        requests.delete(request)
      }
    },
  }
}
