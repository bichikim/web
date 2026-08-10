export const QWEN_MODEL_IDS = ['qwen-0.8b', 'qwen-2b', 'qwen-4b'] as const

export type QwenModelId = (typeof QWEN_MODEL_IDS)[number]

export interface QwenModelDefinition {
  readonly description: string
  readonly downloadSize: string
  readonly id: QwenModelId
  readonly label: string
  readonly repositoryId: string
}

export const QWEN_MODELS: ReadonlyArray<QwenModelDefinition> = [
  {
    description: '빠른 초안과 간단한 요청',
    downloadSize: '약 450MB',
    id: 'qwen-0.8b',
    label: 'Qwen3.5-0.8B',
    repositoryId: 'onnx-community/Qwen3.5-0.8B-ONNX',
  },
  {
    description: '더 자연스러운 장문 원고',
    downloadSize: '약 1.8GB',
    id: 'qwen-2b',
    label: 'Qwen3.5-2B',
    repositoryId: 'onnx-community/Qwen3.5-2B-ONNX',
  },
  {
    description: '한국어 문맥과 표현력 비교용',
    downloadSize: '약 3.3GB',
    id: 'qwen-4b',
    label: 'Qwen3.5-4B',
    repositoryId: 'onnx-community/Qwen3.5-4B-ONNX',
  },
]

export const getQwenModel = (modelId: QwenModelId): QwenModelDefinition => {
  if (modelId === 'qwen-0.8b') {
    return QWEN_MODELS[0]!
  }

  return modelId === 'qwen-2b' ? QWEN_MODELS[1]! : QWEN_MODELS[2]!
}
