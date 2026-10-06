import {createSignal} from 'solid-js'

/** Holds one pending delete confirmation until requested, canceled or completed. */
export const usePendingDeleteConfirmation = () => {
  const [pendingId, setPendingId] = createSignal<string | null>(null)
  const cancel = () => setPendingId(null)
  return {
    cancel,
    isPending: (id: string) => pendingId() === id,
    pendingId,
    request: (id: string) => setPendingId(id),
  }
}
