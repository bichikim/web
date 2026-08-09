import {describe, expect, it} from 'vitest'

import {
  getSupertonicAssetUrl,
  getSupertonicModel,
  getSupertonicModelFileUrl,
  getSupertonicVoiceUrl,
  SUPERTONIC_MODELS,
  SUPERTONIC_VOICES,
} from '../model'

const FULL_MODEL_SIZE = 398_075_273
const INT8_MODEL_SIZE = 144_508_203
const VOICE_COUNT = 10

describe('Supertonic model manifest', () => {
  it('should expose full and INT8 profiles with independent execution policies', () => {
    expect(SUPERTONIC_MODELS).toMatchObject([
      {id: 'full', preferredBackend: 'webgpu', size: FULL_MODEL_SIZE},
      {id: 'int8', preferredBackend: 'wasm', size: INT8_MODEL_SIZE},
    ])
    expect(SUPERTONIC_MODELS.every((model) => model.files.length === 4)).toBe(true)
    expect(SUPERTONIC_MODELS.every((model) => model.speechPolicy)).toBe(true)
    expect(getSupertonicModel('full').speechPolicy).toMatchObject({
      considerSplitLength: 120,
      maximumLength: 200,
      recommendedLength: 150,
    })
  })

  it('should resolve version-pinned model and shared asset URLs', () => {
    const int8Model = getSupertonicModel('int8')
    const vectorEstimator = int8Model.files.find((file) => file.key === 'vectorEstimator')

    expect(vectorEstimator).toBeDefined()
    expect(getSupertonicModelFileUrl(int8Model, vectorEstimator!)).toContain(
      '/resolve/cca5a0e6c96e1d2c720986bf7e75fcc81dee3ae4/vector_estimator.int8.onnx',
    )
    expect(getSupertonicAssetUrl('onnx/tts.json')).toContain(
      '/Supertone/supertonic-3/resolve/3cadd1e/onnx/tts.json',
    )
    expect(getSupertonicVoiceUrl('F2')).toContain('/voice_styles/F2.json')
  })

  it('should expose all fixed voices and reject unsupported model identifiers at runtime', () => {
    expect(SUPERTONIC_VOICES).toHaveLength(VOICE_COUNT)
    expect(new Set(SUPERTONIC_VOICES.map((voice) => voice.id)).size).toBe(VOICE_COUNT)
    expect(() => Reflect.apply(getSupertonicModel, null, ['unknown'])).toThrow(
      '지원하지 않는 Supertonic 모델입니다',
    )
  })
})
