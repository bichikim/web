/** @vitest-environment node */
import {describe, expect, it} from 'vitest'
import classifierArtifact from '../classifier-artifact.json'
import {validateClassifierArtifact} from '../validate-classifier-artifact'

describe('validateClassifierArtifact', () => {
  it('should accept the shipped artifact without changing its weights or metadata', () => {
    const artifact = structuredClone(classifierArtifact)

    expect(validateClassifierArtifact(artifact)).toBeUndefined()
    expect(artifact).toEqual(classifierArtifact)
  })

  it.each(['dimension', 'dtype', 'pooling', 'repositoryId', 'revision'] as const)(
    'should reject a mismatched embedding %s',
    (property) => {
      const artifact = {
        ...classifierArtifact,
        embedding: {...classifierArtifact.embedding, [property]: null},
      }

      expect(() => validateClassifierArtifact(artifact)).toThrow(
        'Text mood classifier artifact does not match the embedding model contract.',
      )
    },
  )

  it.each([
    ['schema version', {schemaVersion: 1}],
    ['label order', {labels: [...classifierArtifact.labels].reverse()}],
    ['primary bias count', {primaryHead: {...classifierArtifact.primaryHead, bias: []}}],
    ['primary weight count', {primaryHead: {...classifierArtifact.primaryHead, weights: []}}],
    [
      'nonfinite primary weight',
      {
        primaryHead: {
          ...classifierArtifact.primaryHead,
          weights: [Number.NaN, ...classifierArtifact.primaryHead.weights.slice(1)],
        },
      },
    ],
    ['temperature', {temperature: 0}],
    ['nonfinite temperature', {temperature: Number.POSITIVE_INFINITY}],
    ['uncertainty margin', {uncertainMargin: -0.1}],
    ['missing insufficiency head', {insufficiencyHead: undefined}],
    [
      'hidden bias count',
      {insufficiencyHead: {...classifierArtifact.insufficiencyHead, hiddenBias: []}},
    ],
    [
      'nonfinite hidden weight',
      {
        insufficiencyHead: {
          ...classifierArtifact.insufficiencyHead,
          hiddenWeights: [
            Number.NaN,
            ...classifierArtifact.insufficiencyHead.hiddenWeights.slice(1),
          ],
        },
      },
    ],
    [
      'hidden weight count',
      {insufficiencyHead: {...classifierArtifact.insufficiencyHead, hiddenWeights: []}},
    ],
    [
      'output weight count',
      {insufficiencyHead: {...classifierArtifact.insufficiencyHead, outputWeights: []}},
    ],
    [
      'nonfinite output bias',
      {insufficiencyHead: {...classifierArtifact.insufficiencyHead, outputBias: Number.NaN}},
    ],
    [
      'insufficiency threshold',
      {insufficiencyHead: {...classifierArtifact.insufficiencyHead, threshold: 2}},
    ],
    [
      'missing modifier head',
      {modifierHeads: {...classifierArtifact.modifierHeads, playful: undefined}},
    ],
    [
      'nonfinite modifier weight',
      {
        modifierHeads: {
          ...classifierArtifact.modifierHeads,
          playful: {
            ...classifierArtifact.modifierHeads.playful,
            weights: [Number.NaN, ...classifierArtifact.modifierHeads.playful.weights.slice(1)],
          },
        },
      },
    ],
    [
      'modifier threshold',
      {
        modifierHeads: {
          ...classifierArtifact.modifierHeads,
          playful: {...classifierArtifact.modifierHeads.playful, threshold: -1},
        },
      },
    ],
    [
      'nonfinite modifier bias',
      {
        modifierHeads: {
          ...classifierArtifact.modifierHeads,
          playful: {...classifierArtifact.modifierHeads.playful, bias: Number.NaN},
        },
      },
    ],
  ])('should reject an invalid %s', (_name, replacement) => {
    expect(() => validateClassifierArtifact({...classifierArtifact, ...replacement})).toThrow(
      'Text mood classifier artifact does not match the embedding model contract.',
    )
  })

  it('should stop at the first incompatible contract before reading later fields', () => {
    const artifact = {
      get embedding() {
        throw new Error('Unexpected embedding read')
      },
      schemaVersion: 1,
    }

    expect(() => validateClassifierArtifact(artifact)).toThrow(
      'Text mood classifier artifact does not match the embedding model contract.',
    )
  })

  it('should preserve errors thrown by an artifact getter', () => {
    const error = new TypeError('Temperature getter failed')
    const artifact = {
      ...classifierArtifact,
      get temperature() {
        throw error
      },
    }

    expect.assertions(1)
    try {
      validateClassifierArtifact(artifact)
    } catch (reason) {
      expect(reason).toBe(error)
    }
  })

  it('should preserve a TypeError for missing nested head data', () => {
    const artifact = {
      ...classifierArtifact,
      primaryHead: {weights: classifierArtifact.primaryHead.weights},
    }

    expect(() => validateClassifierArtifact(artifact)).toThrow(TypeError)
  })

  it('should retain the existing acceptance of unchecked metadata and probability boundaries', () => {
    const artifact = {
      ...classifierArtifact,
      evaluation: undefined,
      insufficiencyHead: {...classifierArtifact.insufficiencyHead, threshold: 1},
      modelKind: 'other',
      uncertainMargin: 0,
    }

    expect(validateClassifierArtifact(artifact)).toBeUndefined()
  })
})
