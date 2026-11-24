import type {InferenceReply, InferenceRequest, LocalInference} from './types'
import {convertFileSrc, invoke, isTauri} from '@tauri-apps/api/core'

/** Runs one local request at a time; abort terminates its worker and releases model memory. */
export const createLocalInference = (): LocalInference => {
  let worker: Worker | null = null
  let disposed = false
  let cancel: (() => void) | null = null
  let revision = 0
  const reset = () => {
    worker?.terminate()
    worker = null
  }
  return {
    dispose: () => {
      disposed = true
      cancel?.()
      reset()
    },
    run: (input, signal, onStatus) => {
      signal.throwIfAborted()
      if (disposed || cancel !== null) {
        return Promise.reject(new Error('로컬 모델을 사용할 수 없어요.'))
      }
      const runtime =
        worker ?? new Worker(new URL('./worker.ts', import.meta.url), {type: 'module'})
      worker = runtime
      revision += 1
      const id = revision
      return new Promise((resolve, reject) => {
        const clean = () => {
          runtime.removeEventListener('message', receive)
          runtime.removeEventListener('error', fail)
          runtime.removeEventListener('messageerror', fail)
          signal.removeEventListener('abort', abort)
          cancel = null
        }
        const abort = () => {
          clean()
          reset()
          reject(signal.reason ?? new DOMException('Cancelled', 'AbortError'))
        }
        const fail = () => {
          clean()
          reset()
          reject(new Error('로컬 모델을 실행하지 못했어요. 다시 시도해 주세요.'))
        }
        const receive = (event: MessageEvent<InferenceReply>) => {
          const reply = event.data
          if (reply.id !== id) {
            return
          }
          switch (reply.type) {
            case 'status':
              onStatus?.(reply.text)
              return
            case 'text':
              clean()
              resolve(reply.text)
              return
            case 'error':
              clean()
              reset()
              reject(new Error(reply.text))
              return
          }
          reply.type satisfies never
        }
        cancel = abort
        runtime.addEventListener('message', receive)
        runtime.addEventListener('error', fail)
        runtime.addEventListener('messageerror', fail)
        signal.addEventListener('abort', abort, {once: true})
        const preparationFailed = (cause: unknown) => {
          if (cancel === abort) {
            clean()
            reset()
            reject(cause)
          }
        }
        const send = (modelPath: string) => {
          if (cancel !== abort) {
            return
          }
          try {
            runtime.postMessage({
              id,
              input,
              modelPath,
              runtimePath: new URL('/semantic-runtime/', globalThis.location.href).href,
            } satisfies InferenceRequest)
          } catch (cause) {
            preparationFailed(cause)
          }
        }
        if (isTauri()) {
          const prepare = async () => {
            if (!(await navigator.gpu?.requestAdapter())) {
              throw new Error('Gemma 4를 실행하려면 WebGPU를 사용할 수 있어야 해요.')
            }
            if (cancel !== abort) {
              return
            }
            onStatus?.('Gemma 4 E2B 준비 중')
            const path = await invoke<string>('prepare_conversation_model')
            send(`${convertFileSrc(path)}/`)
          }
          prepare().catch(preparationFailed)
        } else {
          send(new URL('/conversation-models/', globalThis.location.href).href)
        }
      })
    },
  }
}
