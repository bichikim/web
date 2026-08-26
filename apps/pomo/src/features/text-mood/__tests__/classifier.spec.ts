import {describe, expect, it, vi} from 'vitest'

import classifierArtifact from '../classifier-artifact.json'
import {classifyTextMood, classifyTextSufficiency} from '../classifier'
import {PRIMARY_MOOD_IDS, TEXT_MOOD_CLASSIFIER_INFO} from '../index'
import {TEXT_MOOD_MODEL} from '../model'

describe('classifyTextMood', () => {
  it('should map a trained centroid embedding to the matching primary mood', () => {
    const embedding = classifierArtifact.primaryHead.weights.slice(0, TEXT_MOOD_MODEL.dimension)
    const analysis = classifyTextMood(embedding)

    expect(analysis.primary.id).toBe('cheerful')
    expect(analysis.scores).toHaveLength(PRIMARY_MOOD_IDS.length)
    expect(analysis.modifiers).toHaveLength(2)
    expect(analysis.scores.reduce((sum, score) => sum + score.probability, 0)).toBeCloseTo(1)
  })

  it('should expose uncertainty and a secondary mood for an ambiguous embedding', () => {
    const analysis = classifyTextMood(new Array(TEXT_MOOD_MODEL.dimension).fill(0))

    expect(analysis.uncertain).toBe(true)
    expect(analysis.margin).toBe(0)
    expect(analysis.secondary).not.toBeNull()
  })

  it('should reject embeddings that do not match the model contract', () => {
    expect(() => classifyTextMood([0, 1])).toThrow('384-dimensional embedding')
    expect(() => classifyTextSufficiency([0, 1])).toThrow('384-dimensional embedding')
    expect(() =>
      classifyTextMood([Number.NaN, ...new Array(TEXT_MOOD_MODEL.dimension - 1).fill(0)]),
    ).toThrow('only finite numbers')
  })

  it('should conservatively reject an embedding with strong learned insufficiency evidence', () => {
    const head = classifierArtifact.insufficiencyHead
    const embedding = head.hiddenWeights.slice(
      3 * TEXT_MOOD_MODEL.dimension,
      4 * TEXT_MOOD_MODEL.dimension,
    )
    const length = Math.hypot(...embedding)
    const analysis = classifyTextSufficiency(embedding.map((value) => value / length))

    expect(analysis).toMatchObject({insufficient: true, threshold: 0.94})
    expect(analysis.probability).toBeGreaterThan(analysis.threshold)
  })

  it('should expose the generated evaluation and calibration metadata', () => {
    expect(TEXT_MOOD_CLASSIFIER_INFO).toMatchObject({
      evaluation: {
        insufficiency: {falsePositiveRate: 0, precision: 1, recall: 0.625},
        totalSamples: 324,
      },
      modelKind: 'centroid',
      temperature: 0.05,
      uncertainMargin: 0.075,
    })
  })

  it('should reject an artifact module that violates the classifier contract', async () => {
    vi.resetModules()
    vi.doMock('../classifier-artifact.json', () => ({
      default: {...classifierArtifact, insufficiencyHead: undefined},
    }))

    await expect(import('../classifier')).rejects.toThrow(
      'Text mood classifier artifact does not match the embedding model contract.',
    )

    vi.doUnmock('../classifier-artifact.json')
    vi.resetModules()
  })
})
