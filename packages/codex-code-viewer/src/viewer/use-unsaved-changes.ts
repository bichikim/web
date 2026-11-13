import {type Accessor, batch, createSignal, onCleanup, onMount} from 'solid-js'

interface UseUnsavedChangesProps {
  readonly pending: Accessor<boolean>
  readonly saving: Accessor<boolean>
  readonly saveAll: () => Promise<boolean>
  readonly discardAll: () => void
  readonly settle: () => Promise<unknown>
}
type LeaveChoice = 'save' | 'discard' | 'cancel'

/** Requests a save/discard/cancel choice before teardown or replacing the current connection. */
export const useUnsavedChanges = (props: UseUnsavedChangesProps) => {
  const [confirming, setConfirming] = createSignal(false)
  let leaving: ReturnType<typeof Promise.withResolvers<boolean>> | null = null
  const confirmLeave = (): Promise<boolean> => {
    if (leaving !== null) {
      return leaving.promise
    }
    if (!props.pending() && !props.saving()) {
      return Promise.resolve(true)
    }
    leaving = Promise.withResolvers<boolean>()
    const {promise} = leaving
    if (!props.saving()) {
      setConfirming(true)
      return promise
    }
    props.settle().then(() => {
      if (leaving === null) {
        return
      }
      if (props.pending()) {
        setConfirming(true)
      } else {
        leaving.resolve(true)
        leaving = null
      }
    })
    return promise
  }
  const resolveLeave = async (choice: LeaveChoice): Promise<void> => {
    if (leaving === null || props.saving()) {
      return
    }
    if (choice === 'save' && (!(await props.saveAll()) || props.pending())) {
      return
    }
    const pending = leaving
    leaving = null
    batch(() => {
      if (choice === 'discard') {
        props.discardAll()
      }
      setConfirming(false)
    })
    pending.resolve(choice !== 'cancel')
  }
  onMount(() => {
    const beforeUnload = (event: BeforeUnloadEvent): void => {
      if (props.pending() || props.saving()) {
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
