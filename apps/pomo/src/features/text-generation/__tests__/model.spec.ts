import {describe, expect, it} from 'vitest'

import {getTextModelImplementation, TEXT_MODELS, type TextModelId} from '../model'

describe('text model definitions', () => {
  it('should expose Qwen and Gemma WebGPU models', () => {
    expect(TEXT_MODELS.map((model) => model.id)).toEqual([
      'qwen-0.8b',
      'qwen-2b',
      'qwen-4b',
      'gemma-4-e2b',
      'gemma-4-e2b-mobile',
    ])
    expect(getTextModelImplementation('qwen-0.8b')).toMatchObject({
      architecture: 'qwen-3.5',
      repositoryId: 'onnx-community/Qwen3.5-0.8B-ONNX',
    })
    expect(getTextModelImplementation('qwen-2b')).toMatchObject({
      repositoryId: 'onnx-community/Qwen3.5-2B-ONNX',
    })
    expect(getTextModelImplementation('qwen-4b')).toMatchObject({
      repositoryId: 'onnx-community/Qwen3.5-4B-ONNX',
    })
    expect(getTextModelImplementation('gemma-4-e2b')).toMatchObject({
      architecture: 'gemma-4',
      assetSource: {
        host: 'https://storage.pomofi.io/',
        pathTemplate: 'models/text-generation/{model}/{revision}/',
        revision: '9f4bef82ea6e296bc69f8a2f5939f73af81b07a6',
      },
      downloadSize: '약 3.7GB',
      quantization: 'q4',
      repositoryId: 'onnx-community/gemma-4-E2B-it-ONNX',
    })
    expect(getTextModelImplementation('gemma-4-e2b-mobile')).toMatchObject({
      architecture: 'gemma-4',
      assetSource: {
        host: 'https://huggingface.co/',
        pathTemplate: '{model}/resolve/{revision}/',
        revision: 'main',
      },
      quantization: 'q2f16',
      repositoryId: 'onnx-community/gemma-4-E2B-it-qat-mobile-ONNX',
    })
  })

  it('should reject a text model unavailable in the current build', () => {
    expect(() => getTextModelImplementation('unavailable-model' as TextModelId)).toThrow(
      '현재 빌드에서 사용할 수 없는 텍스트 모델이에요: unavailable-model',
    )
  })
})
