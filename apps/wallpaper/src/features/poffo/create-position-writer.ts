import {getCurrentWindow, type LogicalPosition} from '@tauri-apps/api/window'

/** Coalesces pointer positions while preserving native write order and the final position. */
export const createPositionWriter = (onError: (cause: unknown) => void) => {
  let pending: LogicalPosition | null = null
  let writing = false
  const flush = async () => {
    if (writing) {
      return
    }
    writing = true
    try {
      while (pending !== null) {
        const position = pending
        pending = null
        // oxlint-disable-next-line no-await-in-loop -- Native positions must commit in pointer order.
        await getCurrentWindow().setPosition(position)
      }
    } catch (cause) {
      onError(cause)
    } finally {
      writing = false
    }
  }
  return (position: LogicalPosition) => {
    pending = position
    flush()
  }
}
