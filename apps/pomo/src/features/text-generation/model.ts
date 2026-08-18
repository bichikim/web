export const TEXT_MODEL_IDS = [
  'qwen-0.8b',
  'qwen-2b',
  'qwen-4b',
  'gemma-4-e2b',
  'gemma-4-e2b-mobile',
] as const

export type TextModelId = (typeof TEXT_MODEL_IDS)[number]

export interface TextModelDefinition {
  readonly description: string
  readonly downloadSize: string
  readonly id: TextModelId
  readonly label: string
}

export interface TextModelImplementation extends TextModelDefinition {
  readonly architecture: 'gemma-4' | 'qwen-3.5'
  readonly chatTemplateFile?: string
  readonly quantization: 'q2f16' | 'q4'
  readonly repositoryId: string
}

const TEXT_MODEL_IMPLEMENTATIONS: Record<TextModelId, TextModelImplementation> = {
  'gemma-4-e2b': {
    architecture: 'gemma-4',
    chatTemplateFile: 'chat_template.jinja',
    description: '다른 모델 계열의 한국어 표현 비교용',
    downloadSize: '약 3.7GB',
    id: 'gemma-4-e2b',
    label: 'Gemma 4 E2B',
    quantization: 'q4',
    repositoryId: 'onnx-community/gemma-4-E2B-it-ONNX',
  },
  'gemma-4-e2b-mobile': {
    architecture: 'gemma-4',
    chatTemplateFile: 'chat_template.jinja',
    description: 'q2f16 모바일 양자화 품질 비교용',
    downloadSize: '약 2.3GB',
    id: 'gemma-4-e2b-mobile',
    label: 'Gemma 4 E2B Mobile',
    quantization: 'q2f16',
    repositoryId: 'onnx-community/gemma-4-E2B-it-qat-mobile-ONNX',
  },
  'qwen-0.8b': {
    architecture: 'qwen-3.5',
    description: '빠른 초안과 간단한 요청',
    downloadSize: '약 450MB',
    id: 'qwen-0.8b',
    label: 'Qwen3.5-0.8B',
    quantization: 'q4',
    repositoryId: 'onnx-community/Qwen3.5-0.8B-ONNX',
  },
  'qwen-2b': {
    architecture: 'qwen-3.5',
    description: '더 자연스러운 장문 원고',
    downloadSize: '약 1.8GB',
    id: 'qwen-2b',
    label: 'Qwen3.5-2B',
    quantization: 'q4',
    repositoryId: 'onnx-community/Qwen3.5-2B-ONNX',
  },
  'qwen-4b': {
    architecture: 'qwen-3.5',
    description: '한국어 문맥과 표현력 비교용',
    downloadSize: '약 3.3GB',
    id: 'qwen-4b',
    label: 'Qwen3.5-4B',
    quantization: 'q4',
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
