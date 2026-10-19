import {createSynthesis, type SynthesisClient, type VoiceAudio} from './synthesis'

let resident: SynthesisClient | null = null
let pending = Promise.resolve()

/** Keeps this webview's local model resident while each owner controls its own cancellation. */
export const createResidentSynthesis = (): SynthesisClient => {
  let disposed = false
  let active: AbortController | null = null
  return {
    dispose: () => {
      disposed = true
      active?.abort()
    },
    generate: async (text, voice, caller, observer) => {
      caller.throwIfAborted()
      if (disposed) {
        throw new Error('음성 재생이 종료됐어요.')
      }
      if (active !== null) {
        throw new Error('음성을 생성 중이에요.')
      }
      const request = new AbortController()
      active = request
      const signal = AbortSignal.any([caller, request.signal])
      const cancelled = Promise.withResolvers<never>()
      const abort = () => cancelled.reject(signal.reason)
      signal.addEventListener('abort', abort, {once: true})
      const generated: Promise<VoiceAudio> = pending.then(() => {
        signal.throwIfAborted()
        resident ??= createSynthesis()
        return resident.generate(text, voice, signal, observer)
      })
      pending = generated.then(
        () => undefined,
        () => undefined,
      )
      try {
        return await Promise.race([generated, cancelled.promise])
      } finally {
        signal.removeEventListener('abort', abort)
        if (active === request) {
          active = null
        }
      }
    },
  }
}
