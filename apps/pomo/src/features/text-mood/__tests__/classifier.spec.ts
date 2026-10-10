/** @vitest-environment node */
import {describe, expect, it, vi} from 'vitest'

import classifierArtifact from '../classifier-artifact.json'
import {classifyTextMood, classifyTextSufficiency} from '../classifier'
import {PRIMARY_MOOD_IDS, TEXT_MOOD_CLASSIFIER_INFO} from '../index'
import {TEXT_MOOD_MODEL} from '../model'

describe('classifyTextMood', () => {
  it('should preserve calibrated scores and decisions for a frozen embedding', () => {
    const embedding = Object.freeze(
      Array.from({length: TEXT_MOOD_MODEL.dimension}, (_, index) => ((index % 23) - 11) / 100),
    )
    const mood = classifyTextMood(embedding)
    const expectedScores = [
      {id: 'awe', probability: 0.20652036227705803},
      {id: 'fearful', probability: 0.19140218602814968},
      {id: 'hopeful', probability: 0.14845770460626564},
      {id: 'cheerful', probability: 0.14442859457226595},
      {id: 'dreamlike', probability: 0.1276105554189417},
      {id: 'warm', probability: 0.0792629831208501},
      {id: 'calm', probability: 0.061054586104877843},
      {id: 'anxious', probability: 0.012607607684138029},
      {id: 'angry', probability: 0.008520540299018723},
      {id: 'sad', probability: 0.007466967236031518},
      {id: 'neutral', probability: 0.006530283805974746},
      {id: 'nostalgic', probability: 0.006137628846428152},
    ]

    // Math.exp rounding may differ between engines; labels and decisions remain exact.
    expect(mood).toMatchObject({
      margin: expect.closeTo(0.01511817624890835, 15),
      modifiers: [
        {
          active: false,
          id: 'playful',
          probability: expect.closeTo(0.0780969532901319, 15),
          threshold: 0.25,
        },
        {
          active: false,
          id: 'sarcastic',
          probability: expect.closeTo(0.0626802397889628, 15),
          threshold: 0.2,
        },
      ],
      primary: mood.scores[0],
      scores: expectedScores.map(({id, probability}) => ({
        id,
        probability: expect.closeTo(probability, 15),
      })),
      secondary: mood.scores[1],
      uncertain: true,
    })
    expect(classifyTextSufficiency(embedding)).toMatchObject({
      insufficient: false,
      probability: expect.closeTo(0.00945805642505821, 15),
      threshold: 0.94,
    })
  })

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
    expect(analysis.probability).toBeCloseTo(0.9996135821574212, 15)
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
