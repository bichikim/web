/* eslint-disable no-magic-numbers -- Model hyperparameters and gate candidates are explicit numeric data. */
import {readFile, writeFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'

const FEATURE_COUNT = 512
const HASH_INITIAL = 2_166_136_261
const HASH_MULTIPLIER = 16_777_619
const MAXIMUM_NGRAM_SIZE = 4
const EPOCH_COUNT = 1600
const INITIAL_LEARNING_RATE = 0.8
const REGULARIZATION = 0.0005
const QUANTIZED_MAXIMUM = 127
const LEARNING_RATE_DECAY_EPOCHS = 50
const MINIMUM_EXACT_ACCURACY = 0.95
const MINIMUM_TRANSFORMATION_ACCURACY = 0.97
const SERIALIZED_PRECISION = 10
const GATE_THRESHOLDS = [0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8]
const GATE_MARGINS = [0.02, 0.04, 0.06, 0.08, 0.1, 0.15, 0.2]
const KINDS = ['cardinal', 'count', 'digits', 'identifier', 'preserve']
const NON_TRANSFORMING_KINDS = new Set(['identifier', 'preserve'])
const sourceDirectory = new URL('./', import.meta.url)
const dataUrl = new URL('training-data.json', sourceDirectory)
const evaluationDataUrl = new URL('evaluation-data.json', sourceDirectory)
const outputUrl = new URL(
  '../../apps/pomo/src/features/supertonic/number-speech/model/tiny-speech-number-model.json',
  sourceDirectory,
)

const hashFeature = (feature) => {
  let hash = HASH_INITIAL

  for (const character of feature) {
    hash = Math.imul(hash, HASH_MULTIPLIER) + (character.codePointAt(0) ?? 0)
  }

  return Math.abs(hash) % FEATURE_COUNT
}

const normalizeText = (text) =>
  text
    .toLowerCase()
    .replaceAll(/\s*#\s*/gu, ' # ')
    .replaceAll(/\s+/gu, ' ')
    .trim()

const getFeatureIndexes = (language, text) => {
  const normalized = `${language}:${normalizeText(text)}`
  const features = new Set(normalized.split(' ').map((word) => `w:${word}`))

  for (let size = 2; size <= MAXIMUM_NGRAM_SIZE; size += 1) {
    for (let start = 0; start + size <= normalized.length; start += 1) {
      features.add(`c:${normalized.slice(start, start + size)}`)
    }
  }

  return Array.from(new Set(Array.from(features, hashFeature))).sort((left, right) => left - right)
}

const toExample = (item) => {
  const indexes = getFeatureIndexes(item.language, item.text)
  const value = 1 / Math.sqrt(indexes.length)
  return {...item, indexes, value}
}

const getProbabilities = (model, example) => {
  const logits = KINDS.map((_, kindIndex) => {
    const weights = model.weights[kindIndex]
    return example.indexes.reduce(
      (score, featureIndex) => score + weights[featureIndex] * example.value,
      model.biases[kindIndex],
    )
  })
  const maximum = Math.max(...logits)
  const exponentials = logits.map((value) => Math.exp(value - maximum))
  const total = exponentials.reduce((sum, value) => sum + value, 0)
  return exponentials.map((value) => value / total)
}

const train = (examples) => {
  const classCounts = new Map(
    KINDS.map((kind) => [kind, examples.filter(({label}) => label === kind).length]),
  )
  const model = {
    biases: KINDS.map(() => 0),
    weights: KINDS.map(() => new Float64Array(FEATURE_COUNT)),
  }

  for (let epoch = 0; epoch < EPOCH_COUNT; epoch += 1) {
    const biasGradients = KINDS.map(() => 0)
    const weightGradients = KINDS.map(() => new Float64Array(FEATURE_COUNT))

    for (const example of examples) {
      const probabilities = getProbabilities(model, example)
      const expectedIndex = KINDS.indexOf(example.label)
      const classCount = classCounts.get(example.label)
      const sampleWeight = examples.length / (KINDS.length * classCount)

      for (const [kindIndex, probability] of probabilities.entries()) {
        const error = (probability - (kindIndex === expectedIndex ? 1 : 0)) * sampleWeight
        biasGradients[kindIndex] += error

        for (const featureIndex of example.indexes) {
          weightGradients[kindIndex][featureIndex] += error * example.value
        }
      }
    }

    const learningRate = INITIAL_LEARNING_RATE / Math.sqrt(1 + epoch / LEARNING_RATE_DECAY_EPOCHS)
    for (const [kindIndex, weights] of model.weights.entries()) {
      model.biases[kindIndex] -= (learningRate * biasGradients[kindIndex]) / examples.length
      weights.forEach((weight, featureIndex) => {
        const gradient = weightGradients[kindIndex][featureIndex] / examples.length
        weights[featureIndex] -= learningRate * (gradient + REGULARIZATION * weight)
      })
    }
  }

  return model
}

const classify = (model, example, threshold, margin) => {
  const probabilities = getProbabilities(model, example)
  const ranked = probabilities
    .map((probability, index) => ({index, probability}))
    .sort((left, right) => right.probability - left.probability)
  const [best, second] = ranked

  if (
    best === undefined ||
    second === undefined ||
    best.probability < threshold ||
    best.probability - second.probability < margin
  ) {
    return 'preserve'
  }

  return KINDS[best.index]
}

const selectGate = (model, examples) => {
  const candidates = []

  for (const threshold of GATE_THRESHOLDS) {
    for (const margin of GATE_MARGINS) {
      const predictions = examples.map((example) => classify(model, example, threshold, margin))
      const falseTransformations = predictions.filter(
        (prediction, index) =>
          NON_TRANSFORMING_KINDS.has(examples[index].label) &&
          !NON_TRANSFORMING_KINDS.has(prediction),
      ).length
      const correct = predictions.filter(
        (prediction, index) => prediction === examples[index].label,
      ).length
      const transformed = predictions.filter((prediction) => prediction !== 'preserve').length
      candidates.push({correct, falseTransformations, margin, threshold, transformed})
    }
  }

  return candidates.sort(
    (left, right) =>
      left.falseTransformations - right.falseTransformations ||
      right.correct - left.correct ||
      right.transformed - left.transformed ||
      right.threshold - left.threshold ||
      right.margin - left.margin,
  )[0]
}

const quantize = (weights) => {
  const maximum = weights.reduce((value, weight) => Math.max(value, Math.abs(weight)), 0)
  const unroundedScale = maximum === 0 ? 1 : maximum / QUANTIZED_MAXIMUM
  const scale = Number(unroundedScale.toPrecision(SERIALIZED_PRECISION))
  const values = Int8Array.from(weights, (weight) => Math.round(weight / unroundedScale))
  return {encoded: Buffer.from(values.buffer).toString('base64'), scale, values}
}

const toRuntimeModel = (model) => ({
  biases: model.biases.map((bias) => Number(bias.toPrecision(SERIALIZED_PRECISION))),
  weights: model.weights.map((weights) => {
    const {scale, values} = quantize(weights)
    return Float64Array.from(values, (value) => value * scale)
  }),
})

const compactArrayProperty = (json, property, values) => {
  const prettyValue = JSON.stringify(values, null, 2).replaceAll('\n', '\n  ')
  const compactValue = JSON.stringify(values).replaceAll(',', ', ')
  return json.replace(
    `  ${JSON.stringify(property)}: ${prettyValue}`,
    `  ${JSON.stringify(property)}: ${compactValue}`,
  )
}

const serializeModel = (model, gate, dataCount, evaluation) => {
  const quantized = model.weights.map(quantize)
  const scales = quantized.map(({scale}) => scale)
  const biases = model.biases.map((bias) => Number(bias.toPrecision(SERIALIZED_PRECISION)))
  const artifact = {
    biases,
    evaluation,
    featureCount: FEATURE_COUNT,
    hashInitial: HASH_INITIAL,
    hashMultiplier: HASH_MULTIPLIER,
    kinds: KINDS,
    margin: gate.margin,
    maximumNgramSize: MAXIMUM_NGRAM_SIZE,
    scales,
    schemaVersion: 2,
    threshold: gate.threshold,
    trainingEpochCount: EPOCH_COUNT,
    trainingExampleCount: dataCount,
    weights: quantized.map(({encoded}) => encoded),
  }

  const prettyJson = JSON.stringify(artifact, null, 2)
  const compactBiases = compactArrayProperty(prettyJson, 'biases', artifact.biases)
  const compactKinds = compactArrayProperty(compactBiases, 'kinds', artifact.kinds)
  return `${compactArrayProperty(compactKinds, 'scales', artifact.scales)}\n`
}

const data = JSON.parse(await readFile(dataUrl, 'utf8'))
const evaluationData = JSON.parse(await readFile(evaluationDataUrl, 'utf8'))

if (
  !Array.isArray(data) ||
  data.some(
    (item) =>
      typeof item !== 'object' ||
      item === null ||
      !['en', 'ko'].includes(item.language) ||
      !KINDS.includes(item.label) ||
      !['calibration', 'train'].includes(item.split) ||
      typeof item.text !== 'string' ||
      !item.text.includes('#'),
  )
) {
  throw new Error('Training data contains an invalid example.')
}

if (
  !Array.isArray(evaluationData) ||
  evaluationData.length < 100 ||
  evaluationData.some(
    (item) =>
      typeof item !== 'object' ||
      item === null ||
      !['en', 'ko'].includes(item.language) ||
      !KINDS.includes(item.label) ||
      typeof item.text !== 'string' ||
      !item.text.includes('#'),
  )
) {
  throw new Error('Evaluation data contains an invalid example.')
}

const examples = data.map(toExample)
const trainingExamples = examples.filter(({split}) => split === 'train')
const calibrationExamples = examples.filter(({split}) => split === 'calibration')
const evaluationExamples = evaluationData.map(toExample)
const model = train(trainingExamples)
const runtimeModel = toRuntimeModel(model)
const gate = selectGate(runtimeModel, calibrationExamples)

if (gate === undefined || gate.falseTransformations > 0) {
  throw new Error('Could not find a zero-false-transformation calibration gate.')
}

const evaluationPredictions = evaluationExamples.map((example) =>
  classify(runtimeModel, example, gate.threshold, gate.margin),
)
const evaluationCorrect = evaluationPredictions.filter(
  (prediction, index) => prediction === evaluationExamples[index].label,
).length
const evaluationFalseTransformations = evaluationPredictions.filter(
  (prediction, index) =>
    NON_TRANSFORMING_KINDS.has(evaluationExamples[index].label) &&
    !NON_TRANSFORMING_KINDS.has(prediction),
).length
const evaluationAccuracy = evaluationCorrect / evaluationExamples.length
const evaluationTransformationCorrect = evaluationPredictions.filter(
  (prediction, index) =>
    NON_TRANSFORMING_KINDS.has(prediction) ===
    NON_TRANSFORMING_KINDS.has(evaluationExamples[index].label),
).length
const evaluationTransformationAccuracy = evaluationTransformationCorrect / evaluationExamples.length
const evaluationFailures = evaluationExamples
  .map((example, index) => ({
    expected: example.label,
    predicted: evaluationPredictions[index],
    text: example.text,
  }))
  .filter(({expected, predicted}) => expected !== predicted)

if (
  evaluationAccuracy < MINIMUM_EXACT_ACCURACY ||
  evaluationTransformationAccuracy < MINIMUM_TRANSFORMATION_ACCURACY ||
  evaluationFalseTransformations > 0
) {
  const evaluationReport = {
    evaluationAccuracy,
    evaluationFailures,
    evaluationFalseTransformations,
    evaluationTransformationAccuracy,
    gate,
  }
  throw new Error(`Evaluation failed: ${JSON.stringify(evaluationReport)}`)
}

const evaluation = {
  exactAccuracy: evaluationAccuracy,
  exampleCount: evaluationExamples.length,
  falseTransformationCount: evaluationFalseTransformations,
  transformationAccuracy: evaluationTransformationAccuracy,
}

await writeFile(outputUrl, serializeModel(model, gate, trainingExamples.length, evaluation))
console.log(
  JSON.stringify(
    {
      calibrationExamples: calibrationExamples.length,
      calibrationFalseTransformations: gate.falseTransformations,
      evaluationAccuracy,
      evaluationExamples: evaluationExamples.length,
      evaluationFailures,
      evaluationFalseTransformations,
      evaluationTransformationAccuracy,
      margin: gate.margin,
      output: fileURLToPath(outputUrl),
      threshold: gate.threshold,
      trainingExamples: trainingExamples.length,
      transformedCalibrationExamples: gate.transformed,
    },
    null,
    2,
  ),
)
