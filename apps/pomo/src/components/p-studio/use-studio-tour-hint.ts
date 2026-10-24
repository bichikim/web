import {createSignal, onCleanup, onMount} from 'solid-js'
import {readFocusRoomEntrySession} from 'src/features/focus-room-entry'
import {
  readFocusRoomEntryHistory,
  writeFocusRoomEntryHistory,
} from 'src/features/focus-room-entry-history'

const persistEntry = async () => {
  try {
    await writeFocusRoomEntryHistory()
  } catch (error: unknown) {
    console.warn('Failed to remember focus room entry.', error)
  }
}

export const useStudioTourHint = (enter: () => boolean, openTour: () => void) => {
  const [visible, setVisible] = createSignal(false)
  let dismissed = false
  let disposed = false
  const dismiss = () => {
    dismissed = true
    setVisible(false)
  }
  onCleanup(() => {
    disposed = true
    dismiss()
  })

  onMount(() => {
    if (readFocusRoomEntrySession()) {
      persistEntry()
    }
  })

  const enterStudio = async () => {
    if (!enter()) {
      return
    }
    try {
      const hasEntered = await readFocusRoomEntryHistory()
      if (disposed) {
        return
      }
      if (!hasEntered && !dismissed) {
        setVisible(true)
      }
    } catch (error: unknown) {
      console.warn('Failed to read focus room entry history.', error)
    }
    if (!disposed) {
      await persistEntry()
    }
  }

  return {
    dismiss,
    enter: enterStudio,
    openTour: () => {
      dismiss()
      openTour()
    },
    visible,
  }
}
