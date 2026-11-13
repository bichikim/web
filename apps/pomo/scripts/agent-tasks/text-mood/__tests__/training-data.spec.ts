/** @vitest-environment node */
import {createHash} from 'node:crypto'
import {readFile, writeFile} from 'node:fs/promises'
import {pipeline} from '@huggingface/transformers'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {loadEmbeddings, MODEL} from '../training-data.mjs'

vi.mock('node:fs/promises', () => ({readFile: vi.fn(), writeFile: vi.fn()}))
vi.mock('@huggingface/transformers', () => ({pipeline: vi.fn()}))

const createRow = (id: string, text: string, value: number) => ({
  embedding: Array.from({length: MODEL.dimension}, () => value),
  id,
  text,
})
const fingerprint = (items: ReadonlyArray<unknown>) =>
  createHash('sha256').update(JSON.stringify(items)).digest('hex')
const cacheRows = (rows: ReadonlyArray<ReturnType<typeof createRow>>, hash = 'stale') => {
  vi.mocked(readFile).mockResolvedValue(
    JSON.stringify({datasetFingerprint: hash, model: MODEL, rows, schemaVersion: 1}),
  )
}
interface EmbeddingBatch {
  readonly data: Float32Array
  readonly dims: number[]
}

const extract = vi.fn<(texts: string[]) => Promise<EmbeddingBatch>>()
const dispose = vi.fn(async () => undefined)

beforeEach(() => {
  vi.clearAllMocks()
  extract.mockReset()
  extract.mockImplementation(async (texts) => ({
    data: Float32Array.from(
      texts.flatMap((_text, index) => Array.from({length: MODEL.dimension}, () => index + 10)),
    ),
    dims: [texts.length, MODEL.dimension],
  }))
  vi.mocked(pipeline).mockImplementation(
    vi.fn().mockResolvedValue(Object.assign(extract, {dispose})),
  )
  vi.mocked(writeFile).mockReset().mockResolvedValue(undefined)
  vi.spyOn(process.stdout, 'write').mockReturnValue(true)
})

afterEach(() => vi.restoreAllMocks())

describe('loadEmbeddings cache overlay', () => {
  it('should reuse the last cached identity and retain requested order and metadata', async () => {
    cacheRows([
      createRow('A', 'alpha', 1),
      createRow('B', 'beta', 2),
      createRow('A', 'alpha', 3),
      createRow('unused', 'unused', 4),
    ])
    const items = [
      {id: 'B', label: 'new metadata', text: 'beta'},
      {id: 'C', text: 'gamma'},
      {id: 'A', text: 'alpha'},
    ]
    const result = await loadEmbeddings(items)

    expect(extract).toHaveBeenCalledExactlyOnceWith(['gamma'], {
      normalize: true,
      pooling: MODEL.pooling,
    })
    expect(result).toEqual([
      {...createRow('B', 'beta', 2), label: 'new metadata'},
      createRow('C', 'gamma', 10),
      createRow('A', 'alpha', 3),
    ])
    expect(writeFile).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(/embeddings\.q8\.json$/u),
      `${JSON.stringify({datasetFingerprint: fingerprint(items), model: MODEL, rows: result, schemaVersion: 1})}\n`,
      'utf8',
    )
    expect(dispose).toHaveBeenCalledOnce()
    expect(items).toEqual([
      {id: 'B', label: 'new metadata', text: 'beta'},
      {id: 'C', text: 'gamma'},
      {id: 'A', text: 'alpha'},
    ])
  })

  it('should keep the last extracted duplicate and share its embedding between requested rows', async () => {
    cacheRows([])
    const result = await loadEmbeddings([
      {id: 'A', text: 'alpha'},
      {id: 'A', text: 'alpha'},
    ])

    expect(extract).toHaveBeenCalledWith(['alpha', 'alpha'], expect.any(Object))
    expect(result).toEqual([createRow('A', 'alpha', 11), createRow('A', 'alpha', 11)])
    expect(result[0].embedding).toBe(result[1].embedding)
  })

  it('should extract changed text while reusing the same id with its unchanged text', async () => {
    cacheRows([createRow('A', 'old text', 2)])
    const result = await loadEmbeddings([
      {id: 'A', text: 'new text'},
      {id: 'A', text: 'old text'},
    ])

    expect(extract).toHaveBeenCalledWith(['new text'], expect.any(Object))
    expect(result).toEqual([createRow('A', 'new text', 10), createRow('A', 'old text', 2)])
  })

  it('should rewrite a stale fingerprint without preparing a model when every identity is cached', async () => {
    cacheRows([createRow('A', 'alpha', 2)])
    const items = [{id: 'A', text: 'alpha'}]

    expect(await loadEmbeddings(items)).toEqual([createRow('A', 'alpha', 2)])
    expect(pipeline).not.toHaveBeenCalled()
    expect(writeFile).toHaveBeenCalledOnce()
  })

  it('should retain the exact-cache shortcut without extracting or rewriting', async () => {
    const items = [{id: 'A', text: 'alpha'}]
    cacheRows([createRow('A', 'alpha', 2)], fingerprint(items))

    expect(await loadEmbeddings(items)).toEqual([createRow('A', 'alpha', 2)])
    expect(pipeline).not.toHaveBeenCalled()
    expect(writeFile).not.toHaveBeenCalled()
  })

  it('should rebuild the entire input after the partial cache write fails', async () => {
    cacheRows([createRow('A', 'alpha', 2)])
    vi.mocked(writeFile).mockRejectedValueOnce(new Error('partial write failed'))
    const result = await loadEmbeddings([
      {id: 'A', text: 'alpha'},
      {id: 'B', text: 'beta'},
    ])

    expect(extract).toHaveBeenNthCalledWith(1, ['beta'], expect.any(Object))
    expect(extract).toHaveBeenNthCalledWith(2, ['alpha', 'beta'], expect.any(Object))
    expect(result).toEqual([createRow('A', 'alpha', 10), createRow('B', 'beta', 11)])
    expect(writeFile).toHaveBeenCalledTimes(2)
    expect(dispose).toHaveBeenCalledTimes(2)
    expect(dispose.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(writeFile).mock.invocationCallOrder[0],
    )
  })

  it('should dispose both failed extractions and propagate the full rebuild failure', async () => {
    cacheRows([createRow('A', 'alpha', 2)])
    const partial = new Error('partial extraction failed')
    const full = new Error('full extraction failed')
    extract.mockRejectedValueOnce(partial).mockRejectedValueOnce(full)

    await expect(
      loadEmbeddings([
        {id: 'A', text: 'alpha'},
        {id: 'B', text: 'beta'},
      ]),
    ).rejects.toBe(full)
    expect(extract).toHaveBeenCalledTimes(2)
    expect(dispose).toHaveBeenCalledTimes(2)
    expect(writeFile).not.toHaveBeenCalled()
  })
})
