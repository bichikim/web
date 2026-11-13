import type {SpeechCommand, SpeechReply, SpeechStatus, SpeechSynthesis} from './types'

type SpeechWorker = Pick<
  Worker,
  'addEventListener' | 'removeEventListener' | 'postMessage' | 'terminate'
>

/** 전달받은 Worker의 종료를 포함한 수명 주기를 소유한다. */
export const createSpeechSynthesis = (worker: SpeechWorker): SpeechSynthesis => {
  let nextId = 0
  let cancel: (() => void) | null = null
  let rejectActive: ((cause: Error) => void) | null = null
  let disposed = false
  const terminate = () => {
    if (disposed) {
      return
    }
    disposed = true
    worker.removeEventListener('error', fail)
    worker.removeEventListener('messageerror', fail)
    worker.terminate()
  }
  const fail = () => {
    terminate()
    rejectActive?.(new Error('Speech worker failed'))
  }
  worker.addEventListener('error', fail)
  worker.addEventListener('messageerror', fail)
  const generate = (
    text: string,
    signal: AbortSignal,
    onStatus: (status: SpeechStatus) => void,
  ) => {
    signal.throwIfAborted()
    if (disposed || cancel !== null) {
      throw new Error('Speech worker is unavailable')
    }
    nextId += 1
    const id = nextId
    return new Promise<Blob>((resolve, reject) => {
      const clean = () => {
        worker.removeEventListener('message', receive)
        signal.removeEventListener('abort', abort)
        cancel = null
        rejectActive = null
      }
      const abort = () => {
        clean()
        try {
          worker.postMessage({id, type: 'cancel'} satisfies SpeechCommand)
        } catch (cause) {
          console.warn('Speech cancellation failed', cause)
          terminate()
        }
        reject(signal.reason ?? new DOMException('Cancelled', 'AbortError'))
      }
      const receive = (event: MessageEvent<SpeechReply>) => {
        const message = event.data
        if (message.id !== id) {
          return
        }
        if (message.type === 'status') {
          onStatus(message.status)
        } else {
          clean()
          if (message.type === 'audio') {
            resolve(message.audio)
          } else {
            reject(new Error('Speech synthesis failed'))
          }
        }
      }
      cancel = abort
      rejectActive = (cause) => {
        clean()
        reject(cause)
      }
      worker.addEventListener('message', receive)
      signal.addEventListener('abort', abort, {once: true})
      try {
        worker.postMessage({id, text, type: 'generate'} satisfies SpeechCommand)
      } catch {
        fail()
      }
    })
  }
  return {
    dispose: () => {
      cancel?.()
      terminate()
    },
    generate,
  }
}
