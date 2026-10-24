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
  readonly speechRevision?: Accessor<number>
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
  let activeSpeechRevision: number | undefined
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

  const releaseActiveRequest = (request: ReplySpeechRequest) => {
    if (activeRequest !== request) {
      return
    }

    activeRequest = null
    activeSpeechRevision = undefined
    if (!disposed) {
      setIsSpeaking(false)
    }
  }

  const runRequest = async (request: ReplySpeechRequest) => {
    try {
      const speech = untrack(() => options.speak(request.text))
      activeSpeechRevision = options.speechRevision?.()
      await speech
      request.resolve()
    } catch (error: unknown) {
      request.reject(error)
    } finally {
      releaseActiveRequest(request)
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
  const rejectActiveRequest = () => {
    const request = activeRequest

    if (request === null) {
      return false
    }

    if (request.cancelled) {
      return false
    }

    request.cancelled = true
    request.reject(createCancelledError())
    return true
  }

  const cancelActiveRequest = () => {
    if (!rejectActiveRequest()) {
      return
    }

    options.stop()
  }

  createEffect(() => {
    const enabled = isEnabled()
    const [request] = requests()
    const occupied = options.isOccupied()
    const isDialogueOccupied = options.isDialogueOccupied?.() ?? false
    const speechRevision = options.speechRevision?.()
    const isSpeechSuperseded =
      activeRequest !== null &&
      activeSpeechRevision !== undefined &&
      speechRevision !== undefined &&
      activeSpeechRevision !== speechRevision

    if (isSpeechSuperseded) {
      rejectActiveRequest()
    }

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
    if (occupied && options.speechRevision === undefined) {
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
