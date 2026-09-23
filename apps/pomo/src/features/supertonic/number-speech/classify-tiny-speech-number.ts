import type {SupertonicLanguage} from '../language'
import modelArtifact from './model/tiny-speech-number-model.json'
import type {SpeechNumberDecision} from './types'

interface TinyClassifierOptions {
  readonly language: SupertonicLanguage
  readonly prefix: string
  readonly suffix: string
}

const CONTEXT_LENGTH = 48
const PRESERVE_DECISION: SpeechNumberDecision = {confidence: 1, kind: 'preserve'}
const TINY_SPEECH_NUMBER_KINDS = ['cardinal', 'count', 'digits', 'identifier', 'preserve'] as const
const TINY_SPEECH_NUMBER_MODEL = modelArtifact

const hasExpectedModelShape = () =>
  TINY_SPEECH_NUMBER_MODEL.schemaVersion === 2 &&
  TINY_SPEECH_NUMBER_MODEL.kinds.length === TINY_SPEECH_NUMBER_KINDS.length &&
  TINY_SPEECH_NUMBER_KINDS.every((kind, index) => TINY_SPEECH_NUMBER_MODEL.kinds[index] === kind) &&
  TINY_SPEECH_NUMBER_MODEL.biases.length === TINY_SPEECH_NUMBER_KINDS.length &&
  TINY_SPEECH_NUMBER_MODEL.scales.length === TINY_SPEECH_NUMBER_KINDS.length &&
  TINY_SPEECH_NUMBER_MODEL.weights.length === TINY_SPEECH_NUMBER_KINDS.length

if (!hasExpectedModelShape()) {
  throw new Error('Tiny speech number model does not match the runtime contract.')
}

let decodedWeights: ReadonlyArray<Int8Array> | undefined

const hashFeature = (feature: string) => {
  let hash = TINY_SPEECH_NUMBER_MODEL.hashInitial

  for (const character of feature) {
    hash =
      Math.imul(hash, TINY_SPEECH_NUMBER_MODEL.hashMultiplier) + (character.codePointAt(0) ?? 0)
  }

  return Math.abs(hash) % TINY_SPEECH_NUMBER_MODEL.featureCount
}

const normalizeText = (text: string) =>
  text
    .toLowerCase()
    .replaceAll(/\s*#\s*/gu, ' # ')
    .replaceAll(/\s+/gu, ' ')
    .trim()

const getFeatureIndexes = (language: string, text: string) => {
  const normalized = `${language}:${normalizeText(text)}`
  const features = new Set(normalized.split(' ').map((word) => `w:${word}`))

  for (let size = 2; size <= TINY_SPEECH_NUMBER_MODEL.maximumNgramSize; size += 1) {
    for (let start = 0; start + size <= normalized.length; start += 1) {
      features.add(`c:${normalized.slice(start, start + size)}`)
    }
  }

  return Array.from(new Set(Array.from(features, hashFeature)))
}

const getWeights = () => {
  decodedWeights ??= TINY_SPEECH_NUMBER_MODEL.weights.map((encoded) => {
    const binary = atob(encoded)
    return Int8Array.from(binary, (character) => character.charCodeAt(0))
  })

  return decodedWeights
}

const getProbabilities = (options: TinyClassifierOptions) => {
  const context = `${options.prefix.slice(-CONTEXT_LENGTH)} # ${options.suffix.slice(0, CONTEXT_LENGTH)}`
  const featureIndexes = getFeatureIndexes(options.language, context)
  const featureValue = 1 / Math.sqrt(featureIndexes.length)
  const weights = getWeights()
  const logits = TINY_SPEECH_NUMBER_KINDS.map((_, kindIndex) => {
    const kindWeights = weights[kindIndex]!
    const scale = TINY_SPEECH_NUMBER_MODEL.scales[kindIndex]!

    return featureIndexes.reduce(
      (score, featureIndex) => score + kindWeights[featureIndex]! * scale * featureValue,
      TINY_SPEECH_NUMBER_MODEL.biases[kindIndex]!,
    )
  })
  const maximum = Math.max(...logits)
  const exponentials = logits.map((value) => Math.exp(value - maximum))
  const total = exponentials.reduce((sum, value) => sum + value, 0)

  return exponentials.map((value) => value / total)
}

/** Classifies unresolved number context with an offline-trained quantized logistic model. */
export const classifyTinySpeechNumber = (options: TinyClassifierOptions): SpeechNumberDecision => {
  if (options.language !== 'en' && options.language !== 'ko') {
    return PRESERVE_DECISION
  }

  const ranked = getProbabilities(options)
    .map((confidence, index) => ({confidence, index}))
    .sort((left, right) => right.confidence - left.confidence)
  const [best, second] = ranked

  if (
    best === undefined ||
    second === undefined ||
    best.confidence < TINY_SPEECH_NUMBER_MODEL.threshold ||
    best.confidence - second.confidence < TINY_SPEECH_NUMBER_MODEL.margin
  ) {
    return PRESERVE_DECISION
  }

  return {
    confidence: best.confidence,
    kind: TINY_SPEECH_NUMBER_KINDS[best.index],
  }
}
