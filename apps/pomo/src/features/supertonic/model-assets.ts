import {z} from 'zod'

import {
  parseSupertonicConfig,
  parseSupertonicIndexer,
  type SupertonicConfig,
  type SupertonicIndexer,
} from './engine'
import type {InvalidModelDataError} from './errors'
import type {SupertonicVoiceId} from './model'
import {failureResult, type Result, successResult} from './result'

interface ModelAsset {
  readonly url: string
}

interface SupertonicModelAssets {
  readonly revision: string
  readonly voiceStyles: Readonly<Record<SupertonicVoiceId, ModelAsset>>
}

export interface ModelAssets {
  readonly models: {
    readonly supertonic3: SupertonicModelAssets
  }
  readonly version: 1
}

export interface InitializationAssets {
  readonly config: SupertonicConfig
  readonly indexer: SupertonicIndexer
  readonly modelAssets: ModelAssets
}

interface InitializationAssetValues {
  readonly config: unknown
  readonly indexer: unknown
  readonly modelAssets: unknown
}

const modelAssetSchema = z.object({
  url: z.string().url(),
})

const modelAssetsSchema = z.object({
  models: z.object({
    supertonic3: z.object({
      revision: z.string().min(1),
      voiceStyles: z.object({
        F1: modelAssetSchema,
        F2: modelAssetSchema,
        F3: modelAssetSchema,
        F4: modelAssetSchema,
        F5: modelAssetSchema,
        M1: modelAssetSchema,
        M2: modelAssetSchema,
        M3: modelAssetSchema,
        M4: modelAssetSchema,
        M5: modelAssetSchema,
        Yuna: modelAssetSchema,
      }),
    }),
  }),
  version: z.literal(1),
})

const createDataError = (): InvalidModelDataError => ({
  asset: 'manifest',
  code: 'invalid-model-data',
  phase: 'validate',
  retryable: false,
})

export const parseModelAssets = (value: unknown): Result<ModelAssets, InvalidModelDataError> => {
  const result = modelAssetsSchema.safeParse(value)

  return result.success ? successResult(result.data) : failureResult(createDataError())
}

export const getVoiceStyleUrl = (assets: ModelAssets, voiceId: SupertonicVoiceId): string =>
  assets.models.supertonic3.voiceStyles[voiceId].url

export const parseInitializationAssets = (
  values: InitializationAssetValues,
): Result<InitializationAssets, InvalidModelDataError> => {
  const modelAssets = parseModelAssets(values.modelAssets)
  const config = parseSupertonicConfig(values.config)
  const indexer = parseSupertonicIndexer(values.indexer)

  if (!modelAssets.ok) {
    return modelAssets
  }

  if (!config.ok) {
    return config
  }

  if (!indexer.ok) {
    return indexer
  }

  return successResult({
    config: config.value,
    indexer: indexer.value,
    modelAssets: modelAssets.value,
  })
}
