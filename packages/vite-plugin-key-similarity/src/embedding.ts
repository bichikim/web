import {createHash, randomUUID} from 'node:crypto'
import {mkdir, readFile, rename, rm, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {NORMALIZATION_VERSION} from './normalization'
import {normalizeVector} from './similarity'
import type {EmbeddingProvider, ResolvedKeySimilarityOptions} from './types'

const CACHE_FILE_HEADER = Buffer.from('KSV1')

const createCacheKey = (provider: EmbeddingProvider, normalizedText: string): string =>
  createHash('sha256')
    .update(
      `${NORMALIZATION_VERSION}\0${provider.identifier}\0${provider.revision}\0${normalizedText}`,
    )
    .digest('hex')

export class CachedEmbeddingProvider implements EmbeddingProvider {
  readonly identifier: string
  readonly revision: string
  private readonly cacheDir: string
  private readonly provider: EmbeddingProvider
  private readonly vectors = new Map<string, Float32Array>()

  constructor(provider: EmbeddingProvider, cacheDir: string) {
    this.cacheDir = path.join(cacheDir, 'vectors')
    this.identifier = provider.identifier
    this.provider = provider
    this.revision = provider.revision
  }

  async embed(texts: ReadonlyArray<string>): Promise<ReadonlyArray<Float32Array>> {
    await mkdir(this.cacheDir, {recursive: true})
    const missing: string[] = []
    const uniqueTexts = [...new Set(texts)].filter((text) => !this.vectors.has(text))
    const cached = await Promise.all(
      uniqueTexts.map(async (text) => ({text, vector: await this.read(text)})),
    )
    for (const {text, vector} of cached) {
      if (vector) {
        this.vectors.set(text, vector)
      } else {
        missing.push(text)
      }
    }
    if (missing.length > 0) {
      const generated = await this.provider.embed(missing)
      if (generated.length !== missing.length) {
        throw new Error('Embedding provider returned the wrong count.')
      }
      await Promise.all(
        missing.map(async (text, index) => {
          const vector = normalizeVector(generated[index]!)
          this.vectors.set(text, vector)
          await this.write(text, vector)
        }),
      )
    }
    return texts.map((text) => this.vectors.get(text)!)
  }

  private async read(text: string): Promise<Float32Array | undefined> {
    try {
      const bytes = await readFile(path.join(this.cacheDir, `${createCacheKey(this, text)}.f32`))
      if (!bytes.subarray(0, CACHE_FILE_HEADER.byteLength).equals(CACHE_FILE_HEADER)) {
        return undefined
      }
      const vectorBytes = bytes.subarray(CACHE_FILE_HEADER.byteLength)
      if (
        vectorBytes.byteLength === 0 ||
        vectorBytes.byteLength % Float32Array.BYTES_PER_ELEMENT !== 0
      ) {
        return undefined
      }
      return new Float32Array(
        vectorBytes.buffer.slice(
          vectorBytes.byteOffset,
          vectorBytes.byteOffset + vectorBytes.byteLength,
        ),
      )
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return undefined
      }
      throw error
    }
  }

  private async write(text: string, vector: Float32Array): Promise<void> {
    const bytes = Buffer.concat([
      CACHE_FILE_HEADER,
      Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength),
    ])
    const filePath = path.join(this.cacheDir, `${createCacheKey(this, text)}.f32`)
    const temporaryPath = `${filePath}.${randomUUID()}.tmp`
    try {
      await writeFile(temporaryPath, bytes, {flag: 'wx'})
      await rename(temporaryPath, filePath)
    } finally {
      await rm(temporaryPath, {force: true})
    }
  }
}

export const createLocalE5Provider = async (
  options: ResolvedKeySimilarityOptions,
): Promise<EmbeddingProvider> => {
  const {env, pipeline} = await import('@huggingface/transformers')
  env.allowLocalModels = true
  env.allowRemoteModels = false
  env.localModelPath = `${path.dirname(options.modelPath)}${path.sep}`
  env.cacheDir = options.cacheDir
  if (options.wasmPath !== undefined) {
    const wasmBackend = env.backends.onnx.wasm
    if (wasmBackend === undefined) {
      throw new Error('The local ONNX WASM backend is unavailable.')
    }
    wasmBackend.wasmPaths = options.wasmPath
  }
  const localOptions = Object.fromEntries([
    ['dtype', 'q8'],
    ['local_files_only', true],
  ])
  const extractor = await pipeline(
    'feature-extraction',
    path.basename(options.modelPath),
    localOptions,
  )

  return {
    async embed(texts) {
      const output = await extractor(
        texts.map((text) => `query: ${text}`),
        {normalize: true, pooling: 'mean'},
      )
      return output.tolist().map((values: number[]) => Float32Array.from(values))
    },
    identifier: options.modelIdentifier,
    revision: options.modelRevision,
  }
}
