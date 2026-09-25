import {type Accessor, createEffect, createSignal, onCleanup, untrack} from 'solid-js'

interface ReplySpeechRequest {
  cancelled: boolean
  readonly reject: (error: unknown) => void
  readonly resolve: () => void
  readonly text: string
}

interface UseReplySpeechQueueOptions {
  readonly isEnabled?: Accessor<boolean>
  readonly isOccupied: Accessor<boolean>
  readonly isDialogueOccupied?: Accessor<boolean>
  readonly speak: (text: string) => Promise<void>
  readonly stop: () => void
}

const createCancelledError = () =>
  new DOMException('Reply speech queue was disposed.', 'AbortError')

/** Plays generated replies in order after the active dialogue stack becomes idle. */
export const useReplySpeechQueue = (options: UseReplySpeechQueueOptions) => {
  const [requests, setRequests] = createSignal<ReadonlyArray<ReplySpeechRequest>>([])
  const [isSpeaking, setIsSpeaking] = createSignal(false)
  let activeRequest: ReplySpeechRequest | null = null
  let disposed = false

  const isEnabled = () => options.isEnabled?.() ?? true
  let wasEnabled = isEnabled()

  const enqueue = (text: string) =>
    new Promise<void>((resolve, reject) => {
      if (disposed) {
        reject(createCancelledError())
        return
      }

      setRequests((current) => [...current, {cancelled: false, reject, resolve, text}])
    })

  const runRequest = async (request: ReplySpeechRequest) => {
    try {
      await untrack(() => options.speak(request.text))
      request.resolve()
    } catch (error: unknown) {
      request.reject(error)
    } finally {
      activeRequest = null
      if (!disposed) {
        setIsSpeaking(false)
      }
    }
  }

  const cancelPendingRequests = () => {
    const pendingRequests = requests()
    if (pendingRequests.length === 0) {
      return
    }

    setRequests([])
    const error = createCancelledError()
    pendingRequests.forEach((request) => request.reject(error))
  }
  const cancelActiveRequest = () => {
    const request = activeRequest

    if (request === null || request.cancelled) {
      return
    }

    request.cancelled = true
    request.reject(createCancelledError())
    options.stop()
  }

  createEffect(() => {
    const enabled = isEnabled()
    const [request] = requests()
    const occupied = options.isOccupied()
    const isDialogueOccupied = options.isDialogueOccupied?.() ?? false

    if (!enabled) {
      const shouldCancelActiveRequest = wasEnabled
      wasEnabled = false
      cancelPendingRequests()
      if (shouldCancelActiveRequest) {
        cancelActiveRequest()
      }
      return
    }

    wasEnabled = true
    if (isDialogueOccupied) {
      cancelActiveRequest()
    }
    if (request === undefined || isSpeaking() || occupied) {
      return
    }

    setRequests((current) => current.slice(1))
    setIsSpeaking(true)
    activeRequest = request
    runRequest(request)
  })

  onCleanup(() => {
    disposed = true
    cancelActiveRequest()
    cancelPendingRequests()
  })

  return {enqueue}
}
