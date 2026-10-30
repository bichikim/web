import {createSignal, onCleanup} from 'solid-js'
import {registerWorkspaceNavigationGuard, type WorkspaceNavigationGuard} from './navigate-workspace'

const readLocation = () => {
  const next = new URL(location.href)
  next.searchParams.delete('session')
  return next
}

/** Tracks accepted URL changes, including browser back/forward during an unfinished gesture. */
export const useWorkspaceLocation = (canNavigate: WorkspaceNavigationGuard = () => true) => {
  const initial = readLocation()
  if (initial.href !== location.href) {
    history.replaceState(history.state, '', initial)
  }
  const [current, setCurrent] = createSignal(initial)
  const handleLocation = () => {
    const target = readLocation()
    if (canNavigate(target)) {
      if (target.href !== location.href) {
        history.replaceState(history.state, '', target)
      }
      setCurrent(target)
    } else {
      // Restore the visible page while leaving the requested history entry available for retry.
      history.pushState(history.state, '', current())
    }
  }
  const unregister = registerWorkspaceNavigationGuard(canNavigate)
  globalThis.addEventListener('popstate', handleLocation)
  onCleanup(() => {
    unregister()
    globalThis.removeEventListener('popstate', handleLocation)
  })
  return current
}
