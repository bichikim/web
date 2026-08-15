import classifierArtifact from './classifier-artifact.json'
import {
  MOOD_MODIFIER_IDS,
  type MoodModifierId,
  PRIMARY_MOOD_IDS,
  type PrimaryMoodId,
} from './labels'
import {TEXT_MOOD_MODEL} from './model'

interface LinearHead {
  readonly bias: ReadonlyArray<number>
  readonly weights: ReadonlyArray<number>
}

interface ModifierHead {
  readonly bias: number
  readonly threshold: number
  readonly weights: ReadonlyArray<number>
}

interface InsufficiencyMlpHead {
  readonly hiddenBias: ReadonlyArray<number>
  readonly hiddenWeights: ReadonlyArray<number>
  readonly kind: 'mlp'
  readonly outputBias: number
  readonly outputWeights: ReadonlyArray<number>
  readonly threshold: number
}

interface ClassifierArtifact {
  readonly embedding: {
    readonly dimension: number
    readonly dtype: string
    readonly pooling: string
    readonly repositoryId: string
    readonly revision: string
  }
  readonly evaluation: {
    readonly accuracy: number
    readonly insufficiency: {
      readonly falsePositiveRate: number
      readonly f1: number
      readonly precision: number
      readonly recall: number
      readonly totalSamples: number
    }
    readonly macroF1: number
    readonly modifierF1: Record<MoodModifierId, number>
    readonly topTwoAccuracy: number
    readonly totalSamples: number
  }
  readonly labels: ReadonlyArray<string>
  readonly modelKind: string
  readonly insufficiencyHead: InsufficiencyMlpHead
  readonly modifierHeads: Record<MoodModifierId, ModifierHead>
  readonly primaryHead: LinearHead
  readonly schemaVersion: number
  readonly temperature: number
  readonly uncertainMargin: number
}

export interface MoodScore {
  readonly id: PrimaryMoodId
  readonly probability: number
}

export interface MoodModifierScore {
  readonly active: boolean
  readonly id: MoodModifierId
  readonly probability: number
  readonly threshold: number
}

export interface TextMoodAnalysis {
  readonly margin: number
  readonly modifiers: ReadonlyArray<MoodModifierScore>
  readonly primary: MoodScore
  readonly scores: ReadonlyArray<MoodScore>
  readonly secondary: MoodScore | null
  readonly uncertain: boolean
}

export interface TextSufficiencyAnalysis {
  readonly insufficient: boolean
  readonly probability: number
  readonly threshold: number
}

const ARTIFACT = classifierArtifact as ClassifierArtifact
const SECONDARY_MAXIMUM_MARGIN = 0.25
const SIGMOID_LIMIT = 30
const isFiniteNumber = (value: number) => Number.isFinite(value)
const hasFiniteNumbers = (values: ReadonlyArray<number>) => values.every(isFiniteNumber)
const isProbability = (value: number) => isFiniteNumber(value) && value >= 0 && value <= 1

const hasExpectedPrimaryHead = () => {
  const expectedWeights = PRIMARY_MOOD_IDS.length * TEXT_MOOD_MODEL.dimension
  return (
    ARTIFACT.primaryHead?.bias.length === PRIMARY_MOOD_IDS.length &&
    ARTIFACT.primaryHead.weights.length === expectedWeights &&
    hasFiniteNumbers(ARTIFACT.primaryHead.bias) &&
    hasFiniteNumbers(ARTIFACT.primaryHead.weights)
  )
}

const hasExpectedLabels = () =>
  ARTIFACT.labels?.length === PRIMARY_MOOD_IDS.length &&
  PRIMARY_MOOD_IDS.every((label, index) => ARTIFACT.labels[index] === label)

const hasExpectedModifierHeads = () =>
  MOOD_MODIFIER_IDS.every((modifier) => {
    const head = ARTIFACT.modifierHeads?.[modifier]
    return (
      head !== undefined &&
      head.weights.length === TEXT_MOOD_MODEL.dimension &&
      hasFiniteNumbers(head.weights) &&
      isFiniteNumber(head.bias) &&
      isProbability(head.threshold)
    )
  })

const hasExpectedInsufficiencyHead = () => {
  const head = ARTIFACT.insufficiencyHead
  const hiddenSize = head?.hiddenBias.length ?? 0

  return (
    head?.kind === 'mlp' &&
    hiddenSize > 0 &&
    head.hiddenWeights.length === hiddenSize * TEXT_MOOD_MODEL.dimension &&
    head.outputWeights.length === hiddenSize &&
    hasFiniteNumbers(head.hiddenBias) &&
    hasFiniteNumbers(head.hiddenWeights) &&
    hasFiniteNumbers(head.outputWeights) &&
    isFiniteNumber(head.outputBias) &&
    isProbability(head.threshold)
  )
}

const matchesEmbeddingContract = () =>
  ARTIFACT.embedding?.dimension === TEXT_MOOD_MODEL.dimension &&
  ARTIFACT.embedding.dtype === TEXT_MOOD_MODEL.dtype &&
  ARTIFACT.embedding.pooling === TEXT_MOOD_MODEL.pooling &&
  ARTIFACT.embedding.repositoryId === TEXT_MOOD_MODEL.repositoryId &&
  ARTIFACT.embedding.revision === TEXT_MOOD_MODEL.revision

const validateArtifact = () => {
  if (
    ARTIFACT.schemaVersion !== 2 ||
    !matchesEmbeddingContract() ||
    !hasExpectedLabels() ||
    !hasExpectedPrimaryHead() ||
    !isFiniteNumber(ARTIFACT.temperature) ||
    ARTIFACT.temperature <= 0 ||
    !isProbability(ARTIFACT.uncertainMargin) ||
    !hasExpectedInsufficiencyHead() ||
    !hasExpectedModifierHeads()
  ) {
    throw new Error('Text mood classifier artifact does not match the embedding model contract.')
  }
}

validateArtifact()

const validateEmbedding = (embedding: ReadonlyArray<number>) => {
  if (embedding.length !== TEXT_MOOD_MODEL.dimension) {
    throw new Error(
      `Expected a ${TEXT_MOOD_MODEL.dimension}-dimensional embedding, received ${embedding.length}.`,
    )
  }

  if (!hasFiniteNumbers(embedding)) {
    throw new Error('Expected an embedding containing only finite numbers.')
  }
}

const softmax = (values: ReadonlyArray<number>) => {
  const maximum = Math.max(...values)
  const exponentials = values.map((value) => Math.exp(value - maximum))
  const total = exponentials.reduce((sum, value) => sum + value, 0)
  return exponentials.map((value) => value / total)
}

const sigmoid = (value: number) =>
  1 / (1 + Math.exp(-Math.max(-SIGMOID_LIMIT, Math.min(SIGMOID_LIMIT, value))))

const getLinearScore = (
  embedding: ReadonlyArray<number>,
  weights: ReadonlyArray<number>,
  bias: number,
  weightOffset = 0,
) => {
  let score = bias

  for (let feature = 0; feature < embedding.length; feature += 1) {
    score += weights[weightOffset + feature] * embedding[feature]
  }

  return score
}

const getPrimaryScores = (embedding: ReadonlyArray<number>) => {
  const logits = PRIMARY_MOOD_IDS.map((id, index) => ({
    id,
    logit:
      getLinearScore(
        embedding,
        ARTIFACT.primaryHead.weights,
        ARTIFACT.primaryHead.bias[index],
        index * TEXT_MOOD_MODEL.dimension,
      ) / ARTIFACT.temperature,
  }))
  const probabilities = softmax(logits.map(({logit}) => logit))

  return logits
    .map(({id}, index) => ({id, probability: probabilities[index]}))
    .sort((left, right) => right.probability - left.probability)
}

const getModifierScores = (embedding: ReadonlyArray<number>) =>
  MOOD_MODIFIER_IDS.map((id) => {
    const head = ARTIFACT.modifierHeads[id]
    const probability = sigmoid(getLinearScore(embedding, head.weights, head.bias))
    return {active: probability >= head.threshold, id, probability, threshold: head.threshold}
  })

const getInsufficiencyProbability = (embedding: ReadonlyArray<number>) => {
  const head = ARTIFACT.insufficiencyHead
  const hidden = head.hiddenBias.map((bias, hiddenIndex) =>
    Math.max(
      0,
      getLinearScore(embedding, head.hiddenWeights, bias, hiddenIndex * TEXT_MOOD_MODEL.dimension),
    ),
  )
  return sigmoid(getLinearScore(hidden, head.outputWeights, head.outputBias))
}

/** Decides whether one normalized MiniLM embedding has enough semantic mood evidence. */
export const classifyTextSufficiency = (
  embedding: ReadonlyArray<number>,
): TextSufficiencyAnalysis => {
  validateEmbedding(embedding)

  const probability = getInsufficiencyProbability(embedding)
  const {threshold} = ARTIFACT.insufficiencyHead
  return {insufficient: probability >= threshold, probability, threshold}
}

/** Maps one normalized MiniLM embedding to the versioned Korean mood contract. */
export const classifyTextMood = (embedding: ReadonlyArray<number>): TextMoodAnalysis => {
  validateEmbedding(embedding)

  const scores = getPrimaryScores(embedding)
  const [primary, nextScore] = scores
  const margin = primary.probability - nextScore.probability

  return {
    margin,
    modifiers: getModifierScores(embedding),
    primary,
    scores,
    secondary: margin <= SECONDARY_MAXIMUM_MARGIN ? nextScore : null,
    uncertain: margin < ARTIFACT.uncertainMargin,
  }
}
