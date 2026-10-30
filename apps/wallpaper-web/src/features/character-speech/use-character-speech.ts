import {createMemo, createSignal, onCleanup} from 'solid-js'
import {createBrowserSpeechSession} from './browser'
import type {MouthPose, SpeechSession, SpeechStatus} from './types'

export const SPEECH_LIMIT = 150

export const useCharacterSpeech = () => {
  const [status, setStatus] = createSignal<SpeechStatus>({phase: 'idle'})
  const [mouth, setMouth] = createSignal<MouthPose | null>(null)
  const [cacheUnavailable, setCacheUnavailable] = createSignal(false)
  const busy = createMemo(() => {
    const {phase} = status()
    return (
      phase === 'preparing' ||
      phase === 'downloading' ||
      phase === 'generating' ||
      phase === 'playing'
    )
  })
  let session: SpeechSession | null = null
  let active: AbortController | null = null
  let disposed = false
  const unlock = () => {
    if (disposed) {
      return
    }
    try {
      session ??= createBrowserSpeechSession()
      session.unlock().catch((cause: unknown) => console.warn('Speech audio unlock failed', cause))
    } catch (cause) {
      console.warn('Speech audio unlock failed', cause)
    }
  }
  const stop = () => {
    active?.abort()
    active = null
    setMouth(null)
    setStatus({phase: 'idle'})
  }
  const speak = async (input: string) => {
    const text = input.trim()
    if (disposed || text.length === 0 || text.length > SPEECH_LIMIT) {
      return
    }
    stop()
    setCacheUnavailable(false)
    const request = new AbortController()
    active = request
    setStatus({phase: 'preparing'})
    try {
      session ??= createBrowserSpeechSession()
      const result = await session.speak(text, request.signal, {
        onCacheError: () => {
          if (active === request) {
            setCacheUnavailable(true)
          }
        },
        onMouth: (pose) => {
          if (active === request) {
            setMouth(pose)
          }
        },
        onStatus: (value) => {
          if (active === request) {
            setStatus(value)
          }
        },
      })
      if (active === request) {
        active = null
        setMouth(null)
        setStatus({phase: result.ok || result.error === 'cancelled' ? 'idle' : 'error'})
      }
    } catch (cause) {
      if (active === request) {
        console.error('Character speech failed', cause)
        active = null
        setMouth(null)
        setStatus({phase: 'error'})
      }
    }
  }
  onCleanup(() => {
    disposed = true
    stop()
    session?.dispose()
  })
  return {busy, cacheUnavailable, mouth, speak, status, stop, unlock}
}
