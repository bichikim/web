import {createLayaProviderFactory} from './laya-provider'
import {createOnnxProviderFactory} from './onnx-provider'
import type {DecisionProviderFactory, LayaBackend, ResolvedLayaOptions} from './types'

interface RuntimePlatform {
  readonly architecture: string
  readonly platform: string
}

type ResolvedLayaBackend = Exclude<LayaBackend, 'auto'>

export const resolveLayaBackend = (
  backend: LayaBackend,
  runtime: RuntimePlatform,
): ResolvedLayaBackend => {
  if (backend !== 'auto') {
    return backend
  }
  return runtime.platform === 'darwin' && runtime.architecture === 'arm64' ? 'coreml' : 'onnx'
}

export const createPlatformProviderFactory = (
  options: ResolvedLayaOptions,
): DecisionProviderFactory => {
  const backend = resolveLayaBackend(options.backend, {
    architecture: process.arch,
    platform: process.platform,
  })
  switch (backend) {
    case 'coreml': {
      return createLayaProviderFactory(options)
    }
    case 'onnx': {
      return createOnnxProviderFactory(options.onnx)
    }
    default: {
      const unexpected: never = backend
      throw new Error(`Unsupported Laya backend: ${String(unexpected)}`)
    }
  }
}
