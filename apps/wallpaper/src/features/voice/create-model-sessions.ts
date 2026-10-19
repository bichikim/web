import type {SupertonicModelId} from '@winter-love/supertonic/model'
import {getErrorDetail} from '@winter-love/supertonic/errors'
import {failureResult, successResult} from '@winter-love/supertonic/result'
import {
  loadSupertonicRuntime,
  type SupertonicBackend,
  type SupertonicRuntime,
} from '@winter-love/supertonic/runtime'
import {loadSessions} from '@winter-love/supertonic/sessions'

interface SessionOptions extends Omit<Parameters<typeof loadSessions>[0], 'backend' | 'runtime'> {
  readonly gpu?: boolean
}

/** Remembers GPU availability and model incompatibility for the lifetime of one worker. */
export const createModelSessions = () => {
  const rejected = new Set<SupertonicModelId>()
  const runtimes = new Map<SupertonicBackend, Promise<SupertonicRuntime>>()
  let gpu: boolean | null = null
  const runtimeFor = (backend: SupertonicBackend) => {
    let runtime = runtimes.get(backend)
    if (runtime === undefined) {
      runtime = loadSupertonicRuntime(backend)
      runtimes.set(backend, runtime)
    }
    return runtime
  }
  const initialize = async (options: SessionOptions, backend: SupertonicBackend) => {
    let runtime: SupertonicRuntime
    try {
      runtime = await runtimeFor(backend)
    } catch (cause) {
      return failureResult({
        backend,
        code: 'backend-failed',
        detail: getErrorDetail(cause),
        phase: 'initialize',
        retryable: backend === 'webgpu',
      } as const)
    }
    const result = await loadSessions({...options, backend, runtime})
    return result.ok ? successResult({backend, runtime, sessions: result.value}) : result
  }
  const select = (options: SessionOptions): SupertonicBackend => {
    if (
      options.gpu === false ||
      options.model.preferredBackend !== 'webgpu' ||
      rejected.has(options.model.id)
    ) {
      return 'wasm'
    }
    if (gpu === null) {
      gpu = globalThis.navigator?.gpu !== undefined
    }
    return gpu ? 'webgpu' : 'wasm'
  }
  return {
    disableGpu: (model: SupertonicModelId) => {
      rejected.add(model)
    },
    load: async (options: SessionOptions) => {
      const backend = select(options)
      const result = await initialize(options, backend)
      if (!result.ok && result.error.code === 'backend-failed' && backend === 'webgpu') {
        rejected.add(options.model.id)
        console.warn('Poffo voice GPU initialization failed; using CPU', result.error.detail)
        return initialize(options, 'wasm')
      }
      return result
    },
  }
}
