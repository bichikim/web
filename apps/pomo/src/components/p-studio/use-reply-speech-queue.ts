import {type Accessor, createEffect, createSignal, onCleanup, untrack} from 'solid-js'

interface ReplySpeechRequest {
  readonly reject: (error: unknown) => void
  readonly resolve: () => void
  readonly text: string
}

interface UseReplySpeechQueueOptions {
  readonly isOccupied: Accessor<boolean>
  readonly speak: (text: string) => Promise<void>
}

const createCancelledError = () =>
  new DOMException('Reply speech queue was disposed.', 'AbortError')

/** Plays generated replies in order after the active dialogue stack becomes idle. */
export const useReplySpeechQueue = (options: UseReplySpeechQueueOptions) => {
  const [requests, setRequests] = createSignal<ReadonlyArray<ReplySpeechRequest>>([])
  const [isSpeaking, setIsSpeaking] = createSignal(false)
  let disposed = false

  const enqueue = (text: string) =>
    new Promise<void>((resolve, reject) => {
      setRequests((current) => [...current, {reject, resolve, text}])
    })

  createEffect(() => {
    const [request] = requests()

    if (disposed || request === undefined || isSpeaking() || options.isOccupied()) {
      return
    }

    setRequests((current) => current.slice(1))
    setIsSpeaking(true)
    const speech = untrack(() => options.speak(request.text))
    speech.then(request.resolve, request.reject).finally(() => {
      if (!disposed) {
        setIsSpeaking(false)
      }
    })
  })

  onCleanup(() => {
    disposed = true
    const error = createCancelledError()
    requests().forEach((request) => request.reject(error))
    setRequests([])
  })

  return {enqueue}
}
