/// <reference lib="webworker" />

import {type Result} from '../../result'
import {getErrorDetail, type SupertonicError, type WorkerFailedError} from '../errors'
import type {SupertonicWorkerInput, SupertonicWorkerOutput} from '../messages'
import {getSupertonicModel} from '../model'
import type {SupertonicBackend} from '../runtime'

interface GeneratedAudio {
  readonly generationTime: number
  readonly sampleRate: number
  readonly samples: Float32Array
}

export interface CreateSupertonicWorkerDispatchOptions {
  readonly cancelGeneration: () => void
  readonly dispose: () => Promise<void>
  readonly generate: (
    message: Extract<SupertonicWorkerInput, {type: 'generate'}>,
  ) => Promise<Result<GeneratedAudio, SupertonicError>>
  readonly initialize: (
    model: ReturnType<typeof getSupertonicModel>,
  ) => Promise<Result<SupertonicBackend, SupertonicError>>
  readonly postMessage: (
    message: SupertonicWorkerOutput,
    transfer?: ReadonlyArray<Transferable>,
  ) => void
}

const createWorkerError = (
  phase: WorkerFailedError['phase'],
  error: unknown,
): WorkerFailedError => ({
  code: 'worker-failed',
  detail: getErrorDetail(error),
  phase,
  retryable: true,
})

/** Translates worker messages into runtime operations and protocol responses. */
export const createSupertonicWorkerDispatch =
  (options: CreateSupertonicWorkerDispatchOptions) =>
  async (event: MessageEvent<SupertonicWorkerInput>): Promise<void> => {
    const message = event.data

    try {
      switch (message.type) {
        case 'cancel-generation':
          options.cancelGeneration()
          return
        case 'dispose':
          await options.dispose()
          options.postMessage({type: 'disposed'})
          return
        case 'generate': {
          const result = await options.generate(message)

          if (result.ok) {
            options.postMessage(
              {
                generationTime: result.value.generationTime,
                requestId: message.requestId,
                sampleRate: result.value.sampleRate,
                samples: result.value.samples,
                type: 'result',
              },
              [result.value.samples.buffer],
            )
          } else {
            options.postMessage({error: result.error, requestId: message.requestId, type: 'error'})
          }
          return
        }
        case 'initialize': {
          let model: ReturnType<typeof getSupertonicModel>

          try {
            model = getSupertonicModel(message.modelId)
          } catch {
            options.postMessage({
              error: {
                code: 'invalid-model',
                modelId: message.modelId,
                phase: 'initialize',
                retryable: false,
              },
              requestId: null,
              type: 'error',
            })
            return
          }

          const result = await options.initialize(model)

          if (result.ok) {
            options.postMessage({backend: result.value, type: 'ready'})
          } else {
            options.postMessage({error: result.error, requestId: null, type: 'error'})
          }
          return
        }
      }

      message satisfies never
    } catch (error: unknown) {
      options.postMessage({
        error: createWorkerError(message.type === 'generate' ? 'generate' : 'initialize', error),
        requestId: message.type === 'generate' ? message.requestId : null,
        type: 'error',
      })
    }
  }
