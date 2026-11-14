import {createSignal, onCleanup, onMount} from 'solid-js'
import {parseLibrary} from './parse-library'
import type {MusicLibrary} from './types'

export const useMusicLibrary = () => {
  const [library, setLibrary] = createSignal<MusicLibrary | null>(null)
  const [status, setStatus] = createSignal<'loading' | 'ready' | 'error'>('loading')
  let cancellation: AbortController | null = null
  const load = async () => {
    cancellation?.abort()
    const request = new AbortController()
    cancellation = request
    setStatus('loading')
    try {
      const response = await fetch('/music/library.json', {
        cache: 'no-store',
        signal: request.signal,
      })
      const parsed = response.ok ? parseLibrary(await response.json()) : null
      if (!request.signal.aborted) {
        setLibrary(parsed)
        setStatus(parsed === null ? 'error' : 'ready')
      }
    } catch {
      if (!request.signal.aborted) {
        setStatus('error')
      }
    }
  }
  onMount(load)
  onCleanup(() => cancellation?.abort())
  return {
    library,
    retry: load,
    status,
  }
}
