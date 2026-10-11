import {on} from 'node:events'
import {MessageChannel, Worker} from 'node:worker_threads'
import {z} from 'zod'
import type {NavigationReview} from './navigation-cache'
import {type NavigationInput, type NavigationResult, navigationSchema} from '../shared/contracts'

const messageSchema = z.union([
  z.object({batch: navigationSchema.required()}),
  z.object({done: z.literal(true)}),
  z.object({error: z.string()}),
])

/** Reuses one navigation worker per workspace and terminates active analysis on cancellation. */
export const createNavigationWorker = (root: string) => {
  let worker: Worker | null = null
  let active: AbortController | null = null
  const dispose = (): void => {
    active?.abort()
    const previous = worker
    worker = null
    previous?.terminate()
  }
  return {
    dispose,
    scan: async function* (
      input: NavigationInput,
      signal: AbortSignal,
      review: NavigationReview = {},
    ): AsyncGenerator<NavigationResult> {
      active?.abort()
      const controller = new AbortController()
      active = controller
      const combined = AbortSignal.any([signal, controller.signal])
      combined.throwIfAborted()
      worker ??= new Worker(
        new URL(
          import.meta.url.endsWith('.ts') ? './navigation/bootstrap.ts' : './navigation-worker.js',
          import.meta.url,
        ),
        {workerData: root},
      )
      const thread = worker
      thread.ref()
      const {port1, port2} = new MessageChannel()
      const stop = (): void => {
        if (worker === thread) {
          worker = null
        }
        thread.terminate()
      }
      const fail = (error: Error): void => {
        port1.emit('error', error)
      }
      const exit = (): void => fail(new Error('Navigation worker exited before completion'))
      combined.addEventListener('abort', stop, {once: true})
      thread.once('error', fail)
      thread.once('exit', exit)
      const messages = on(port1, 'message', {signal: combined})
      thread.postMessage({channel: port2, input, review}, [port2])
      let complete = false
      try {
        for await (const [value] of messages) {
          const message = messageSchema.parse(value)
          if ('error' in message) {
            throw new Error(message.error)
          }
          if ('done' in message) {
            complete = true
            return
          }
          yield message.batch
          combined.throwIfAborted()
          port1.postMessage({consumed: true})
        }
      } finally {
        combined.removeEventListener('abort', stop)
        thread.removeListener('error', fail)
        thread.removeListener('exit', exit)
        port1.close()
        await messages.return?.()
        if (active === controller) {
          active = null
        }
        if (complete) {
          thread.unref()
        } else {
          stop()
        }
      }
    },
  }
}
