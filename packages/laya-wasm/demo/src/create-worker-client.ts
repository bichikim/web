import type {Command, Reply} from './types'

export interface WorkerCallbacks {
  readonly onMessage: (message: Reply) => void
  readonly onFailure: () => void
}

export const createWorkerClient = (callbacks: WorkerCallbacks) => {
  let worker: Worker | null = null
  const close = (): void => {
    worker?.terminate()
    worker = null
  }
  const send = (command: Command): void => {
    if (worker === null) {
      worker = new Worker(new URL('./model.worker.ts', import.meta.url), {type: 'module'})
      worker.addEventListener('message', (event: MessageEvent<Reply>) =>
        callbacks.onMessage(event.data),
      )
      const handleFailure = (): void => {
        close()
        callbacks.onFailure()
      }
      worker.addEventListener('error', handleFailure)
      worker.addEventListener('messageerror', handleFailure)
    }
    worker.postMessage(command)
  }
  return {close, send}
}
