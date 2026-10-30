import {playSpeechAudio} from './audio-player'
import {prepareSpeechPlayback} from './prepare-playback'
import type {CreateSpeechSessionOptions, SpeechSession, SpeechSynthesis} from './types'

export const createSpeechSession = (options: CreateSpeechSessionOptions): SpeechSession => {
  const {context} = options
  const lifetime = new AbortController()
  let synthesis: SpeechSynthesis | null = null
  return {
    dispose: () => {
      lifetime.abort()
      synthesis?.dispose()
      context.close().catch((cause: unknown) => console.warn('Speech audio close failed', cause))
    },
    speak: async (input, caller, observer) => {
      const signal = AbortSignal.any([caller, lifetime.signal])
      try {
        // Resume while the click still carries user activation, before downloading or synthesis.
        await context.resume()
        signal.throwIfAborted()
        const playback = await prepareSpeechPlayback({
          cache: options.cache,
          context,
          fetch: options.fetch,
          generate: (text) => {
            synthesis ??= options.createSynthesis()
            return synthesis.generate(text, signal, observer.onStatus)
          },
          getCacheKey: options.getCacheKey,
          input,
          onCacheError: observer.onCacheError,
          signal,
        })
        observer.onStatus({phase: 'playing'})
        await playSpeechAudio({
          ...playback,
          context,
          frames: options.frames,
          onMouth: observer.onMouth,
          signal,
        })
        return {ok: true}
      } catch (cause) {
        if (signal.aborted) {
          return {error: 'cancelled', ok: false}
        }
        console.error('Local speech failed', cause)
        synthesis?.dispose()
        synthesis = null
        return {error: 'unavailable', ok: false}
      }
    },
    unlock: () => context.resume(),
  }
}
