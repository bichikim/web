/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {getTextModel, getTextModelImplementation, TEXT_MODELS, type TextModelId} from '../model'

describe('text model definitions', () => {
  it('should expose Qwen and Gemma WebGPU models', () => {
    expect(TEXT_MODELS.map((model) => model.id)).toEqual([
      'qwen-0.8b',
      'qwen-2b',
      'qwen-4b',
      'lfm-1.2b',
      'gemma-4-e2b',
      'gemma-4-e2b-mobile',
      'lfm-2.6b-qad',
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
    expect(getTextModelImplementation('lfm-1.2b')).toMatchObject({
      architecture: 'lfm-2',
      quantization: 'q4',
      repositoryId: 'LiquidAI/LFM2.5-1.2B-Instruct-ONNX',
    })
    expect(getTextModelImplementation('lfm-2.6b-qad')).toMatchObject({
      architecture: 'lfm-2-gguf',
      quantization: 'q4_0',
      repositoryId: 'LiquidAI/LFM2.5-2.6B-GGUF',
      tokenizerSubfolder: 'qad',
      weightFile: 'LFM2.5-2.6B-QAD-Q4_0.gguf',
    })
    expect(getTextModel('gemma-4-e2b')).toMatchObject({id: 'gemma-4-e2b'})
  })

  it('should reject a text model unavailable in the current build', () => {
    expect(() => getTextModelImplementation('unavailable-model' as TextModelId)).toThrow(
      '현재 빌드에서 사용할 수 없는 텍스트 모델이에요: unavailable-model',
    )
  })
})
