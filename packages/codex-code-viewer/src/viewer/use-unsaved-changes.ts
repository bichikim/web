import {type Accessor, batch, createSignal, onCleanup, onMount} from 'solid-js'

interface UnsavedChangesOptions {
  readonly pending: Accessor<boolean>
  readonly saving: Accessor<boolean>
  readonly saveAll: () => Promise<boolean>
  readonly discardAll: () => void
  readonly settle: () => Promise<unknown>
}
type LeaveChoice = 'save' | 'discard' | 'cancel'

/** Requests a save/discard/cancel choice before teardown or replacing the current connection. */
export const useUnsavedChanges = (options: UnsavedChangesOptions) => {
  const [confirming, setConfirming] = createSignal(false)
  let leaving: ReturnType<typeof Promise.withResolvers<boolean>> | null = null
  const confirmLeave = (): Promise<boolean> => {
    if (leaving !== null) {
      return leaving.promise
    }
    if (!options.pending() && !options.saving()) {
      return Promise.resolve(true)
    }
    leaving = Promise.withResolvers<boolean>()
    const {promise} = leaving
    if (!options.saving()) {
      setConfirming(true)
      return promise
    }
    options.settle().then(() => {
      if (leaving === null) {
        return
      }
      if (options.pending()) {
        setConfirming(true)
      } else {
        leaving.resolve(true)
        leaving = null
      }
    })
    return promise
  }
  const resolveLeave = async (choice: LeaveChoice): Promise<void> => {
    if (leaving === null || options.saving()) {
      return
    }
    if (choice === 'save' && (!(await options.saveAll()) || options.pending())) {
      return
    }
    const pending = leaving
    leaving = null
    batch(() => {
      if (choice === 'discard') {
        options.discardAll()
      }
      setConfirming(false)
    })
    pending.resolve(choice !== 'cancel')
  }
  onMount(() => {
    const beforeUnload = (event: BeforeUnloadEvent): void => {
      if (options.pending() || options.saving()) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    onCleanup(() => window.removeEventListener('beforeunload', beforeUnload))
  })
  onCleanup(() => {
    leaving?.resolve(false)
    leaving = null
  })
  return {confirming, confirmLeave, resolveLeave}
}
