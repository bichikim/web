import {describe, expect, it} from 'vitest'

import {getTextModelImplementation, TEXT_MODELS} from '../model'

describe('text model definitions', () => {
  it('should expose compact, quality, and larger WebGPU models', () => {
    expect(TEXT_MODELS.map((model) => model.id)).toEqual(['qwen-0.8b', 'qwen-2b', 'qwen-4b'])
    expect(getTextModelImplementation('qwen-0.8b')).toMatchObject({
      repositoryId: 'onnx-community/Qwen3.5-0.8B-ONNX',
    })
    expect(getTextModelImplementation('qwen-2b')).toMatchObject({
      repositoryId: 'onnx-community/Qwen3.5-2B-ONNX',
    })
    expect(getTextModelImplementation('qwen-4b')).toMatchObject({
      repositoryId: 'onnx-community/Qwen3.5-4B-ONNX',
    })
  })
})
