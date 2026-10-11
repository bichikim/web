import {MOOD_MODIFIER_IDS, type MoodModifierId, PRIMARY_MOOD_IDS} from './labels'
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

export interface ClassifierArtifact {
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

const isFiniteNumber = (value: number) => Number.isFinite(value)
const hasFiniteNumbers = (values: ReadonlyArray<number>) => values.every(isFiniteNumber)
const isProbability = (value: number) => isFiniteNumber(value) && value >= 0 && value <= 1

const hasExpectedPrimaryHead = (artifact: ClassifierArtifact) => {
  const expectedWeights = PRIMARY_MOOD_IDS.length * TEXT_MOOD_MODEL.dimension
  return (
    artifact.primaryHead?.bias.length === PRIMARY_MOOD_IDS.length &&
    artifact.primaryHead.weights.length === expectedWeights &&
    hasFiniteNumbers(artifact.primaryHead.bias) &&
    hasFiniteNumbers(artifact.primaryHead.weights)
  )
}

const hasExpectedLabels = (artifact: ClassifierArtifact) =>
  artifact.labels?.length === PRIMARY_MOOD_IDS.length &&
  PRIMARY_MOOD_IDS.every((label, index) => artifact.labels[index] === label)

const hasExpectedModifierHeads = (artifact: ClassifierArtifact) =>
  MOOD_MODIFIER_IDS.every((modifier) => {
    const head = artifact.modifierHeads?.[modifier]
    return (
      head !== undefined &&
      head.weights.length === TEXT_MOOD_MODEL.dimension &&
      hasFiniteNumbers(head.weights) &&
      isFiniteNumber(head.bias) &&
      isProbability(head.threshold)
    )
  })

const hasExpectedInsufficiencyHead = (artifact: ClassifierArtifact) => {
  const head = artifact.insufficiencyHead
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

const matchesEmbeddingContract = (artifact: ClassifierArtifact) =>
  artifact.embedding?.dimension === TEXT_MOOD_MODEL.dimension &&
  artifact.embedding.dtype === TEXT_MOOD_MODEL.dtype &&
  artifact.embedding.pooling === TEXT_MOOD_MODEL.pooling &&
  artifact.embedding.repositoryId === TEXT_MOOD_MODEL.repositoryId &&
  artifact.embedding.revision === TEXT_MOOD_MODEL.revision

/** Checks the classifier weights and calibration against the pinned embedding contract. */
export const validateClassifierArtifact = (input: unknown): void => {
  const artifact = input as ClassifierArtifact
  if (
    artifact.schemaVersion !== 2 ||
    !matchesEmbeddingContract(artifact) ||
    !hasExpectedLabels(artifact) ||
    !hasExpectedPrimaryHead(artifact) ||
    !isFiniteNumber(artifact.temperature) ||
    artifact.temperature <= 0 ||
    !isProbability(artifact.uncertainMargin) ||
    !hasExpectedInsufficiencyHead(artifact) ||
    !hasExpectedModifierHeads(artifact)
  ) {
    throw new Error('Text mood classifier artifact does not match the embedding model contract.')
  }
}
