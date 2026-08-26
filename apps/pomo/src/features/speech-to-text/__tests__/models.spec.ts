import {describe, expect, it} from 'vitest'

import {
  DEFAULT_SPEECH_MODEL_ID,
  getSpeechModel,
  RECOMMENDED_SPEECH_MODEL_ID,
  SPEECH_MODELS,
} from '../index'

describe('speech recognition models', () => {
  it('should expose unique browser-ready model identifiers', () => {
    expect(new Set(SPEECH_MODELS.map((model) => model.id)).size).toBe(SPEECH_MODELS.length)
    expect(getSpeechModel(DEFAULT_SPEECH_MODEL_ID).family).toBe('whisper')
    expect(getSpeechModel(RECOMMENDED_SPEECH_MODEL_ID)).toMatchObject({
      family: 'moonshine',
      repositoryId: 'onnx-community/moonshine-tiny-ko-ONNX',
    })
    expect(getSpeechModel('whisper-base').family).toBe('whisper')
    expect(() => getSpeechModel('missing' as never)).toThrow(
      '지원하지 않는 음성 인식 모델입니다: missing',
    )
  })
})
