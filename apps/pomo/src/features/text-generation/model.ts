export const TEXT_MODEL_IDS = ['qwen-0.8b', 'qwen-2b', 'qwen-4b'] as const

export type TextModelId = (typeof TEXT_MODEL_IDS)[number]

export interface TextModelDefinition {
  readonly description: string
  readonly downloadSize: string
  readonly id: TextModelId
  readonly label: string
}

export interface TextModelImplementation extends TextModelDefinition {
  readonly repositoryId: string
}

const TEXT_MODEL_IMPLEMENTATIONS: Record<TextModelId, TextModelImplementation> = {
  'qwen-0.8b': {
    description: '빠른 초안과 간단한 요청',
    downloadSize: '약 450MB',
    id: 'qwen-0.8b',
    label: 'Qwen3.5-0.8B',
    repositoryId: 'onnx-community/Qwen3.5-0.8B-ONNX',
  },
  'qwen-2b': {
    description: '더 자연스러운 장문 원고',
    downloadSize: '약 1.8GB',
    id: 'qwen-2b',
    label: 'Qwen3.5-2B',
    repositoryId: 'onnx-community/Qwen3.5-2B-ONNX',
  },
  'qwen-4b': {
    description: '한국어 문맥과 표현력 비교용',
    downloadSize: '약 3.3GB',
    id: 'qwen-4b',
    label: 'Qwen3.5-4B',
    repositoryId: 'onnx-community/Qwen3.5-4B-ONNX',
  },
}

export const TEXT_MODELS: ReadonlyArray<TextModelDefinition> = TEXT_MODEL_IDS.map(
  (modelId) => TEXT_MODEL_IMPLEMENTATIONS[modelId],
)

export const getTextModel = (modelId: TextModelId): TextModelDefinition =>
  TEXT_MODEL_IMPLEMENTATIONS[modelId]

export const getTextModelImplementation = (modelId: TextModelId): TextModelImplementation =>
  TEXT_MODEL_IMPLEMENTATIONS[modelId]
