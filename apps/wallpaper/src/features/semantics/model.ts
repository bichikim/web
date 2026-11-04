import {convertFileSrc, isTauri} from '@tauri-apps/api/core'
import {resolveResource} from '@tauri-apps/api/path'
import type {SemanticReply, SemanticRequest} from './protocol'

interface SemanticPending {
  readonly resolve: (vectors: readonly (readonly number[])[]) => void
  readonly reject: (cause: Error) => void
}

export const createSemanticModel = () => {
  let worker: Worker | null = null
  let nextId = 0
  let disposed = false
  const requests = new Map<number, SemanticPending>()
  const reset = (cause: Error) => {
    worker?.terminate()
    worker = null
    for (const request of requests.values()) {
      request.reject(cause)
    }
    requests.clear()
  }
  const start = () => {
    const runtime = new Worker(new URL('./worker.ts', import.meta.url), {type: 'module'})
    runtime.onmessage = (event: MessageEvent<SemanticReply>) => {
      const reply = event.data
      const request = requests.get(reply.id)
      requests.delete(reply.id)
      if (reply.type === 'error') {
        request?.reject(new Error(reply.message))
      } else {
        request?.resolve(reply.vectors)
      }
    }
    runtime.onerror = () => reset(new Error('로컬 분석 모델을 실행하지 못했어요.'))
    runtime.onmessageerror = () => reset(new Error('로컬 분석 모델의 응답을 읽지 못했어요.'))
    worker = runtime
    return runtime
  }
  return {
    dispose: () => {
      disposed = true
      reset(new Error('텍스트 분석이 종료됐어요.'))
    },
    embed: async (texts: readonly string[]): Promise<readonly (readonly number[])[]> => {
      if (disposed) {
        throw new Error('텍스트 분석이 종료됐어요.')
      }
      const modelPath = isTauri()
        ? `${convertFileSrc(await resolveResource('semantic-models'))}/`
        : new URL('/semantic-models/', globalThis.location.href).href
      if (disposed) {
        throw new Error('텍스트 분석이 종료됐어요.')
      }
      const runtimePath = new URL('/semantic-runtime/', globalThis.location.href).href
      const runtime = worker ?? start()
      nextId += 1
      const id = nextId
      return new Promise((resolve, reject) => {
        requests.set(id, {reject, resolve})
        try {
          runtime.postMessage({id, modelPath, runtimePath, texts} satisfies SemanticRequest)
        } catch (cause) {
          requests.delete(id)
          reject(cause)
        }
      })
    },
  }
}
