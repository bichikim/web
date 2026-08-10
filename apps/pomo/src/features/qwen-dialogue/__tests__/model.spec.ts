import {describe, expect, it} from 'vitest'

import {getQwenModel, QWEN_MODELS} from '../model'

describe('Qwen model definitions', () => {
  it('should expose compact, quality, and larger WebGPU models', () => {
    expect(QWEN_MODELS.map((model) => model.id)).toEqual(['qwen-0.8b', 'qwen-2b', 'qwen-4b'])
    expect(getQwenModel('qwen-0.8b')).toMatchObject({
      repositoryId: 'onnx-community/Qwen3.5-0.8B-ONNX',
    })
    expect(getQwenModel('qwen-2b')).toMatchObject({
      repositoryId: 'onnx-community/Qwen3.5-2B-ONNX',
    })
    expect(getQwenModel('qwen-4b')).toMatchObject({
      repositoryId: 'onnx-community/Qwen3.5-4B-ONNX',
    })
  })
})
