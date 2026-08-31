import path from 'node:path'
import {z} from 'zod'
import {
  DEFAULT_SEMANTIC_THRESHOLD,
  DIAGNOSTIC_MODES,
  type KeySimilarityOptions,
  type ResolvedKeySimilarityOptions,
  SERVE_DIAGNOSTIC_MODES,
  type SimilarityThreshold,
} from './types'

const BUNDLED_MODEL_IDENTIFIER = 'Xenova/multilingual-e5-small'
const BUNDLED_MODEL_REVISION = '761b726'
const BUNDLED_MODEL_PATH = path.resolve(import.meta.dirname, '../assets/multilingual-e5-small')

interface ResolveThresholdOptions {
  readonly fallback: number
  readonly maximum: number
  readonly minimum: number
  readonly name: string
  readonly threshold: SimilarityThreshold | undefined
}

const optionsSchema = z.object({
  buildMode: z.enum(DIAGNOSTIC_MODES).default('error'),
  cacheDir: z.string().min(1).default('node_modules/.cache/key-similarity'),
  exclude: z
    .array(z.string().min(1))
    .default(['**/*.spec.*', '**/*.test.*', '**/generated/**', '**/node_modules/**']),
  modelIdentifier: z.string().min(1).optional(),
  modelPath: z.string().min(1).optional(),
  modelRevision: z.string().min(1).optional(),
  scanInclude: z.array(z.string().min(1)).min(1).default(['src/**/*.{ts,tsx,js,jsx,mts,mjs}']),
  serveMode: z.enum(SERVE_DIAGNOSTIC_MODES).default('warn'),
  wasmPath: z.string().min(1).optional(),
})

const resolveThreshold = (options: ResolveThresholdOptions): SimilarityThreshold => {
  const {fallback, maximum, minimum, name, threshold} = options
  const resolved = threshold ?? fallback
  if (typeof resolved === 'function') {
    return resolved
  }
  if (!Number.isFinite(resolved) || resolved < minimum || resolved > maximum) {
    throw new RangeError(`${name} must be between ${minimum} and ${maximum}.`)
  }
  return resolved
}

export const resolveOptions = (
  options: KeySimilarityOptions,
  root: string,
): ResolvedKeySimilarityOptions => {
  const parsed = optionsSchema.parse(options)
  if (typeof options.keyDetector !== 'function') {
    throw new TypeError('keyDetector must be a function.')
  }
  const customModelPath =
    parsed.modelPath === undefined ? undefined : path.resolve(root, parsed.modelPath)
  const modelPath = customModelPath ?? BUNDLED_MODEL_PATH

  return {
    ...parsed,
    cacheDir: path.resolve(root, parsed.cacheDir),
    keyDetector: options.keyDetector,
    modelIdentifier: parsed.modelIdentifier ?? customModelPath ?? BUNDLED_MODEL_IDENTIFIER,
    modelPath,
    modelRevision:
      parsed.modelRevision ?? (customModelPath === undefined ? BUNDLED_MODEL_REVISION : 'local'),
    root: path.resolve(root),
    semanticThreshold: resolveThreshold({
      fallback: DEFAULT_SEMANTIC_THRESHOLD,
      maximum: 1,
      minimum: -1,
      name: 'semanticThreshold',
      threshold: options.semanticThreshold,
    }),
    wasmPath: parsed.wasmPath === undefined ? undefined : path.resolve(root, parsed.wasmPath),
  }
}
