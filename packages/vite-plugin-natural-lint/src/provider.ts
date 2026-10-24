import {createJevProviderFactory} from './jev-provider'
import {createLayaProviderFactory} from './laya-provider'
import {createOnnxProviderFactory} from './onnx-provider'
import {createProviderPoolFactory} from './provider-pool'
import type {
  DecisionProviderFactory,
  LayaBackend,
  ResolvedLayaOptions,
  ResolvedNaturalLintOptions,
} from './types'

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
  let factory: DecisionProviderFactory
  switch (backend) {
    case 'coreml': {
      factory = createLayaProviderFactory(options)
      break
    }
    case 'onnx': {
      factory = createOnnxProviderFactory(options.onnx)
      break
    }
    default: {
      const unexpected: never = backend
      throw new Error(`Unsupported Laya backend: ${String(unexpected)}`)
    }
  }
  return options.instances === 1 ? factory : createProviderPoolFactory(factory, options.instances)
}

export const createDecisionProviderFactory = (
  options: ResolvedNaturalLintOptions,
): DecisionProviderFactory => {
  switch (options.provider) {
    case 'jev': {
      return createJevProviderFactory(options.jev, options.root)
    }
    case 'laya': {
      return createPlatformProviderFactory(options.laya)
    }
    default: {
      const unexpected: never = options.provider
      throw new Error(`Unsupported decision provider: ${String(unexpected)}`)
    }
  }
}
