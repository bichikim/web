import {normalizeSpeechText} from '@winter-love/supertonic/number-speech'
import {getSupertonicModel} from '@winter-love/supertonic/model'
import type {SynthesisReply, SynthesisRequest} from './protocol'
import type {PoffoVoice} from '@winter-love/wallpaper/settings/voice'
import type {VoiceStatus} from './readout'

export interface VoiceAudio {
  readonly text?: string
  readonly sampleRate: number
  readonly samples: Float32Array
}
export interface VoiceOutput {
  readonly status: (value: VoiceStatus) => void
  readonly audio?: (audio: VoiceAudio) => void
}
export interface SynthesisClient {
  readonly dispose: () => void
  readonly generate: (
    text: string,
    voice: PoffoVoice,
    signal: AbortSignal,
    observer: VoiceOutput,
  ) => Promise<VoiceAudio>
}
/** Owns one resident worker; cancellation drops obsolete output while retaining loaded model sessions. */
export const createSynthesis = (): SynthesisClient => {
  let worker: Worker | null = null
  let nextId = 0
  let disposed = false
  let cancel: (() => void) | null = null
  const reset = () => {
    worker?.terminate()
    worker = null
  }
  return {
    dispose: () => {
      disposed = true
      cancel?.()
      reset()
    },
    generate: async (text, voice, signal, observer) => {
      const {status} = observer
      signal.throwIfAborted()
      if (cancel !== null) {
        throw new Error('음성을 생성 중이에요.')
      }
      if (disposed) {
        throw new Error('음성 재생이 종료됐어요.')
      }
      const runtime =
        worker ?? new Worker(new URL('./worker.ts', import.meta.url), {type: 'module'})
      worker = runtime
      const settings = {...voice}
      nextId += 1
      const id = nextId
      const audio = await new Promise<Extract<SynthesisReply, {type: 'audio'}>>(
        (resolve, reject) => {
          const clean = () => {
            runtime.removeEventListener('message', receive)
            runtime.removeEventListener('error', fail)
            runtime.removeEventListener('messageerror', fail)
            signal.removeEventListener('abort', abort)
            cancel = null
          }
          const abort = () => {
            clean()
            runtime.postMessage({id, type: 'cancel'})
            reject(signal.reason ?? new DOMException('Cancelled', 'AbortError'))
          }
          cancel = abort
          const fail = () => {
            clean()
            reset()
            reject(new Error('음성 모델을 불러올 수 없어요.'))
          }
          const receive = (event: MessageEvent<SynthesisReply>) => {
            const message = event.data
            if (message.id !== id) {
              return
            }
            if (message.type === 'status') {
              status(message.status)
            } else {
              clean()
              if (message.type === 'error') {
                reject(new Error(message.message))
              } else {
                resolve(message)
              }
            }
          }
          runtime.addEventListener('message', receive)
          runtime.addEventListener('error', fail)
          runtime.addEventListener('messageerror', fail)
          signal.addEventListener('abort', abort, {once: true})
          try {
            runtime.postMessage({
              id,
              text: normalizeSpeechText({
                language: settings.language,
                maximumLength: getSupertonicModel(settings.model).speechPolicy.maximumLength,
                text,
              }),
              type: 'generate',
              voice: settings,
            } satisfies SynthesisRequest)
          } catch (cause) {
            clean()
            reset()
            reject(cause)
          }
        },
      )
      signal.throwIfAborted()
      return audio
    },
  }
}
