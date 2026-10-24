import {numericallyStableSoftmax} from 'src/utils/numerically-stable-softmax'
import {clamp} from 'es-toolkit/math'
import classifierArtifact from './classifier-artifact.json'
import type {
  MoodModifierScore,
  MoodScore,
  TextMoodAnalysis,
  TextSufficiencyAnalysis,
} from './analysis'
import {MOOD_MODIFIER_IDS, PRIMARY_MOOD_IDS} from './labels'
import {TEXT_MOOD_MODEL} from './model'
import {type ClassifierArtifact, validateClassifierArtifact} from './validate-classifier-artifact'

const ARTIFACT = classifierArtifact as ClassifierArtifact
const SECONDARY_MAXIMUM_MARGIN = 0.25
const SIGMOID_LIMIT = 30
const isFiniteNumber = (value: number) => Number.isFinite(value)
const hasFiniteNumbers = (values: ReadonlyArray<number>) => values.every(isFiniteNumber)

validateClassifierArtifact(ARTIFACT)

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

const sigmoid = (value: number) => 1 / (1 + Math.exp(-clamp(value, -SIGMOID_LIMIT, SIGMOID_LIMIT)))

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
  const probabilities = numericallyStableSoftmax(logits.map(({logit}) => logit))

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
