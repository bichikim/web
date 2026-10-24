import {createSignal, onCleanup} from 'solid-js'

/** Tracks workspace navigation and the browser's back/forward history. */
export const useWorkspaceLocation = () => {
  const [current, setCurrent] = createSignal(new URL(location.href))
  const handleLocation = () => setCurrent(new URL(location.href))
  globalThis.addEventListener('popstate', handleLocation)
  onCleanup(() => globalThis.removeEventListener('popstate', handleLocation))
  return current
}
