import {mkdtemp, rm} from 'node:fs/promises'
import path from 'node:path'
import {describe, expect, it, vi} from 'vitest'

const transformerEnvironment = {
  allowLocalModels: false,
  allowRemoteModels: true,
  backends: {onnx: {wasm: {wasmPaths: ''}}},
  cacheDir: '',
  localModelPath: '',
}
const extractor = vi.fn(async () => ({tolist: () => [[3, 4]]}))
const pipeline = vi.fn(async () => extractor)

vi.mock('@huggingface/transformers', () => ({env: transformerEnvironment, pipeline}))

import {resolveOptions} from '../config'
import {CachedEmbeddingProvider, createLocalE5Provider} from '../embedding'

describe('createLocalE5Provider', () => {
  it('should force local-only model and WASM loading', async () => {
    const options = resolveOptions(
      {
        cacheDir: '.cache',
        keyDetector: () => undefined,
        modelPath: 'models/multilingual-e5-small',
        wasmPath: 'wasm',
      },
      '/project',
    )
    const provider = await createLocalE5Provider(options)
    const vectors = await provider.embed(['로그인에 실패했습니다.'])

    expect(transformerEnvironment).toMatchObject({
      allowLocalModels: true,
      allowRemoteModels: false,
      localModelPath: '/project/models/',
    })
    expect(transformerEnvironment.backends.onnx.wasm.wasmPaths).toBe('/project/wasm')
    expect(pipeline).toHaveBeenCalledWith('feature-extraction', 'multilingual-e5-small', {
      dtype: 'q8',
      local_files_only: true,
    })
    expect(extractor).toHaveBeenCalledWith(['query: 로그인에 실패했습니다.'], {
      normalize: true,
      pooling: 'mean',
    })
    expect([...vectors[0]!]).toEqual([3, 4])
  })
})

describe('CachedEmbeddingProvider', () => {
  it('should retain vectors in memory after the disk cache is removed', async () => {
    const cacheDir = await mkdtemp(path.join(import.meta.dirname, '.embedding-'))
    const embed = vi.fn(async () => [Float32Array.from([1, 0])])
    const provider = new CachedEmbeddingProvider(
      {embed, identifier: 'memory-cache', revision: '1'},
      cacheDir,
    )

    try {
      const first = await provider.embed(['문장'])
      await rm(cacheDir, {force: true, recursive: true})
      const second = await provider.embed(['문장'])

      expect(embed).toHaveBeenCalledOnce()
      expect(second[0]).toBe(first[0])
    } finally {
      await rm(cacheDir, {force: true, recursive: true})
    }
  })
})
