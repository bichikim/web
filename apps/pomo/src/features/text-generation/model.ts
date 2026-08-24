const DEVELOPMENT_TEXT_MODEL_IDS = ['qwen-0.8b', 'qwen-2b', 'qwen-4b'] as const

const PRODUCTION_TEXT_MODEL_IDS = ['gemma-4-e2b', 'gemma-4-e2b-mobile'] as const

export type TextModelId =
  | (typeof DEVELOPMENT_TEXT_MODEL_IDS)[number]
  | (typeof PRODUCTION_TEXT_MODEL_IDS)[number]

export const TEXT_MODEL_IDS: ReadonlyArray<TextModelId> = import.meta.env.DEV
  ? [...DEVELOPMENT_TEXT_MODEL_IDS, ...PRODUCTION_TEXT_MODEL_IDS]
  : PRODUCTION_TEXT_MODEL_IDS

export interface TextModelDefinition {
  readonly description: string
  readonly downloadSize: string
  readonly id: TextModelId
  readonly label: string
}

export interface TextModelImplementation extends TextModelDefinition {
  readonly architecture: 'gemma-4' | 'qwen-3.5'
  readonly assetSource: TextModelAssetSource
  readonly quantization: 'q2f16' | 'q4'
  readonly repositoryId: string
}

export interface TextModelAssetSource {
  readonly host: string
  readonly pathTemplate: string
  readonly revision: string
}

const HUGGING_FACE_MODEL_SOURCE = {
  host: 'https://huggingface.co/',
  pathTemplate: '{model}/resolve/{revision}/',
  revision: 'main',
} as const

const POMO_R2_MODEL_HOST = 'https://storage.pomofi.io/'
const POMO_R2_TEXT_MODEL_PATH_TEMPLATE = 'models/text-generation/{model}/{revision}/'

const createPomoR2ModelSource = (revision: string): TextModelAssetSource => ({
  host: POMO_R2_MODEL_HOST,
  pathTemplate: POMO_R2_TEXT_MODEL_PATH_TEMPLATE,
  revision,
})

const PRODUCTION_TEXT_MODEL_IMPLEMENTATIONS: Record<
  (typeof PRODUCTION_TEXT_MODEL_IDS)[number],
  TextModelImplementation
> = {
  'gemma-4-e2b': {
    architecture: 'gemma-4',
    assetSource: createPomoR2ModelSource('9f4bef82ea6e296bc69f8a2f5939f73af81b07a6'),
    description: '다른 모델 계열의 한국어 표현 비교용',
    downloadSize: '약 3.7GB',
    id: 'gemma-4-e2b',
    label: 'Gemma 4 E2B',
    quantization: 'q4',
    repositoryId: 'onnx-community/gemma-4-E2B-it-ONNX',
  },
  'gemma-4-e2b-mobile': {
    architecture: 'gemma-4',
    assetSource: HUGGING_FACE_MODEL_SOURCE,
    description: 'q2f16 모바일 양자화 품질 비교용',
    downloadSize: '약 2.3GB',
    id: 'gemma-4-e2b-mobile',
    label: 'Gemma 4 E2B Mobile',
    quantization: 'q2f16',
    repositoryId: 'onnx-community/gemma-4-E2B-it-qat-mobile-ONNX',
  },
}

const createDevelopmentTextModels = (): Partial<Record<TextModelId, TextModelImplementation>> => ({
  'qwen-0.8b': {
    architecture: 'qwen-3.5',
    assetSource: HUGGING_FACE_MODEL_SOURCE,
    description: '빠른 초안과 간단한 요청',
    downloadSize: '약 450MB',
    id: 'qwen-0.8b',
    label: 'Qwen3.5-0.8B',
    quantization: 'q4',
    repositoryId: 'onnx-community/Qwen3.5-0.8B-ONNX',
  },
  'qwen-2b': {
    architecture: 'qwen-3.5',
    assetSource: HUGGING_FACE_MODEL_SOURCE,
    description: '더 자연스러운 장문 원고',
    downloadSize: '약 1.8GB',
    id: 'qwen-2b',
    label: 'Qwen3.5-2B',
    quantization: 'q4',
    repositoryId: 'onnx-community/Qwen3.5-2B-ONNX',
  },
  'qwen-4b': {
    architecture: 'qwen-3.5',
    assetSource: HUGGING_FACE_MODEL_SOURCE,
    description: '한국어 문맥과 표현력 비교용',
    downloadSize: '약 3.3GB',
    id: 'qwen-4b',
    label: 'Qwen3.5-4B',
    quantization: 'q4',
    repositoryId: 'onnx-community/Qwen3.5-4B-ONNX',
  },
})

const TEXT_MODEL_IMPLEMENTATIONS: Partial<Record<TextModelId, TextModelImplementation>> = {
  ...PRODUCTION_TEXT_MODEL_IMPLEMENTATIONS,
  ...(import.meta.env.DEV ? createDevelopmentTextModels() : {}),
}

const getAvailableTextModel = (modelId: TextModelId): TextModelImplementation => {
  const model = TEXT_MODEL_IMPLEMENTATIONS[modelId]

  if (model === undefined) {
    throw new Error(`현재 빌드에서 사용할 수 없는 텍스트 모델이에요: ${modelId}`)
  }

  return model
}

export const TEXT_MODELS: ReadonlyArray<TextModelDefinition> =
  TEXT_MODEL_IDS.map(getAvailableTextModel)

export const getTextModel = (modelId: TextModelId): TextModelDefinition =>
  getAvailableTextModel(modelId)

export const getTextModelImplementation = (modelId: TextModelId): TextModelImplementation =>
  getAvailableTextModel(modelId)
