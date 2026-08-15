// oxlint-disable no-await-in-loop -- Embedding batches stay sequential to cap model memory use.

import {readFile, writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import {pipeline} from '@huggingface/transformers'

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url))
const APPLICATION_DIRECTORY = resolve(SCRIPT_DIRECTORY, '../..')
export const DATASET_PATH = resolve(SCRIPT_DIRECTORY, 'dataset.json')
export const HARD_EXAMPLES_PATH = resolve(SCRIPT_DIRECTORY, 'hard-examples.json')
export const SUFFICIENCY_DATASET_PATH = resolve(SCRIPT_DIRECTORY, 'sufficiency-dataset.json')
const EMBEDDINGS_PATH = resolve(SCRIPT_DIRECTORY, 'embeddings.q8.json')
export const ARTIFACT_PATH = resolve(
  APPLICATION_DIRECTORY,
  'src/features/text-mood/classifier-artifact.json',
)
export const CLASSIFIER_INFO_PATH = resolve(
  APPLICATION_DIRECTORY,
  'src/features/text-mood/classifier-info.json',
)
export const REPORT_PATH = resolve(SCRIPT_DIRECTORY, 'training-report.json')
export const MODEL = {
  dimension: 384,
  dtype: 'q8',
  pooling: 'mean',
  repositoryId: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
  revision: '2c4055b12046f11709e9df2c122e59ffbdc2f900',
}
export const PRIMARY_LABELS = [
  'cheerful',
  'calm',
  'warm',
  'hopeful',
  'dreamlike',
  'awe',
  'nostalgic',
  'sad',
  'anxious',
  'fearful',
  'angry',
  'neutral',
]
export const MODIFIER_LABELS = ['playful', 'sarcastic']
const EXTRACTION_BATCH_SIZE = 16
export const MODIFIER_TRAINING_CONFIGURATIONS = [
  {epochs: 120, learningRate: 0.01, regularization: 0.004},
  {epochs: 160, learningRate: 0.015, regularization: 0.008},
  {epochs: 180, learningRate: 0.01, regularization: 0.015},
  {epochs: 220, learningRate: 0.02, regularization: 0.004},
  {epochs: 120, learningRate: 0.02, regularization: 0.02},
]
export const INSUFFICIENCY_TRAINING_CONFIGURATIONS = [
  {epochs: 140, kind: 'linear', learningRate: 0.01, regularization: 0.004},
  {epochs: 180, kind: 'linear', learningRate: 0.015, regularization: 0.008},
  {epochs: 220, hiddenSize: 12, kind: 'mlp', learningRate: 0.006, regularization: 0.008},
  {epochs: 180, hiddenSize: 16, kind: 'mlp', learningRate: 0.008, regularization: 0.015},
  {epochs: 240, hiddenSize: 12, kind: 'mlp', learningRate: 0.004, regularization: 0.02},
]

export const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'))

export const validateDataset = (dataset) => {
  if (dataset.schemaVersion !== 1 || !Array.isArray(dataset.items)) {
    throw new Error('Unsupported text mood dataset schema.')
  }

  const ids = new Set()
  const texts = new Set()
  const counts = new Map(PRIMARY_LABELS.map((label) => [label, new Map()]))

  for (const item of dataset.items) {
    if (ids.has(item.id)) {
      throw new Error(`Duplicate dataset id: ${item.id}`)
    }

    if (!PRIMARY_LABELS.includes(item.primary)) {
      throw new Error(`Unknown primary label: ${item.primary}`)
    }

    if (!['train', 'validation', 'test'].includes(item.split)) {
      throw new Error(`Unknown dataset split: ${item.split}`)
    }

    if (typeof item.text !== 'string' || item.text.trim().length === 0) {
      throw new Error(`Missing text in: ${item.id}`)
    }

    if (texts.has(item.text)) {
      throw new Error(`Duplicate dataset text: ${item.text}`)
    }

    if (
      !Array.isArray(item.modifiers) ||
      item.modifiers.some((modifier) => !MODIFIER_LABELS.includes(modifier))
    ) {
      throw new Error(`Unknown modifier in: ${item.id}`)
    }

    ids.add(item.id)
    texts.add(item.text)
    const splitCounts = counts.get(item.primary)
    splitCounts.set(item.split, (splitCounts.get(item.split) ?? 0) + 1)
  }

  for (const [label, splitCounts] of counts) {
    for (const split of ['train', 'validation', 'test']) {
      if ((splitCounts.get(split) ?? 0) === 0) {
        throw new Error(`Missing ${split} examples for ${label}.`)
      }
    }
  }
}

export const validateSufficiencyDataset = (dataset) => {
  if (dataset.schemaVersion !== 1 || !Array.isArray(dataset.items)) {
    throw new Error('Unsupported text sufficiency dataset schema.')
  }

  const ids = new Set()
  const texts = new Set()

  for (const item of dataset.items) {
    if (ids.has(item.id) || texts.has(item.text)) {
      throw new Error(`Duplicate sufficiency example: ${item.id}`)
    }

    if (
      typeof item.sufficient !== 'boolean' ||
      typeof item.text !== 'string' ||
      item.text.trim().length === 0 ||
      !['train', 'validation', 'test'].includes(item.split)
    ) {
      throw new Error(`Invalid sufficiency example: ${item.id}`)
    }

    ids.add(item.id)
    texts.add(item.text)
  }

  for (const split of ['train', 'validation', 'test']) {
    for (const sufficient of [true, false]) {
      if (!dataset.items.some((item) => item.split === split && item.sufficient === sufficient)) {
        throw new Error(`Missing ${split} sufficiency examples for ${sufficient}.`)
      }
    }
  }
}

const extractEmbeddings = async (items) => {
  const extractor = await pipeline('feature-extraction', MODEL.repositoryId, {
    device: 'cpu',
    dtype: MODEL.dtype,
    revision: MODEL.revision,
  })
  const rows = []

  try {
    for (let offset = 0; offset < items.length; offset += EXTRACTION_BATCH_SIZE) {
      const batch = items.slice(offset, offset + EXTRACTION_BATCH_SIZE)
      const output = await extractor(
        batch.map((item) => item.text),
        {normalize: true, pooling: MODEL.pooling},
      )

      if (output.dims.length !== 2 || output.dims[1] !== MODEL.dimension) {
        throw new Error(`Unexpected embedding shape: ${output.dims.join(' × ')}`)
      }

      for (let index = 0; index < batch.length; index += 1) {
        const start = index * MODEL.dimension
        rows.push({
          ...batch[index],
          embedding: Array.from(output.data.slice(start, start + MODEL.dimension)),
        })
      }

      const completed = Math.min(items.length, offset + batch.length)
      process.stdout.write(`\rEmbedding ${completed}/${items.length}`)
    }
  } finally {
    await extractor.dispose()
  }

  process.stdout.write('\n')
  return rows
}

export const loadEmbeddings = async (items) => {
  const datasetFingerprint = createHash('sha256').update(JSON.stringify(items)).digest('hex')

  try {
    const cached = await readJson(EMBEDDINGS_PATH)
    const currentIds = items.map((item) => item.id)
    const cachedRows = Array.isArray(cached.rows) ? cached.rows : []
    const cachedIds = cachedRows.map((item) => item.id)
    const hasValidEmbeddings = cachedRows.every(
      (row) =>
        Array.isArray(row.embedding) &&
        row.embedding.length === MODEL.dimension &&
        row.embedding.every(Number.isFinite),
    )

    if (
      cached.schemaVersion === 1 &&
      cached.model.repositoryId === MODEL.repositoryId &&
      cached.model.dtype === MODEL.dtype &&
      cached.model.revision === MODEL.revision &&
      cached.model.pooling === MODEL.pooling &&
      cached.model.dimension === MODEL.dimension &&
      hasValidEmbeddings
    ) {
      if (
        cached.datasetFingerprint === datasetFingerprint &&
        JSON.stringify(currentIds) === JSON.stringify(cachedIds)
      ) {
        return items.map((item, index) => ({...item, embedding: cachedRows[index].embedding}))
      }

      const cachedByIdentity = new Map(cachedRows.map((row) => [`${row.id}\u0000${row.text}`, row]))
      const missingItems = items.filter(
        (item) => !cachedByIdentity.has(`${item.id}\u0000${item.text}`),
      )
      const extractedRows = missingItems.length === 0 ? [] : await extractEmbeddings(missingItems)
      const rowsByIdentity = new Map([
        ...cachedByIdentity,
        ...extractedRows.map((row) => [`${row.id}\u0000${row.text}`, row]),
      ])
      const rows = items.map((item) => {
        const cachedRow = rowsByIdentity.get(`${item.id}\u0000${item.text}`)
        return cachedRow === undefined ? undefined : {...item, embedding: cachedRow.embedding}
      })

      if (rows.every(Boolean)) {
        await writeFile(
          EMBEDDINGS_PATH,
          `${JSON.stringify({datasetFingerprint, model: MODEL, rows, schemaVersion: 1})}\n`,
          'utf8',
        )
        return rows
      }
    }
  } catch {
    // A missing or stale cache is rebuilt from the source dataset below.
  }

  const rows = await extractEmbeddings(items)
  await writeFile(
    EMBEDDINGS_PATH,
    `${JSON.stringify({datasetFingerprint, model: MODEL, rows, schemaVersion: 1})}\n`,
    'utf8',
  )
  return rows
}
