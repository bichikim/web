import {POMO_R2_ASSET_HOST} from '../product-assets'

const DEVELOPMENT_TEXT_MODEL_IDS = ['qwen-0.8b', 'qwen-2b', 'qwen-4b', 'lfm-1.2b'] as const

const PRODUCTION_TEXT_MODEL_IDS = ['gemma-4-e2b', 'gemma-4-e2b-mobile', 'lfm-2.6b-qad'] as const

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

export interface TransformersTextModelImplementation extends TextModelDefinition {
  readonly architecture: 'gemma-4' | 'lfm-2' | 'qwen-3.5'
  readonly assetSource: TextModelAssetSource
  readonly quantization: 'q2f16' | 'q4'
  readonly repositoryId: string
}

export interface GgufTextModelImplementation extends TextModelDefinition {
  readonly architecture: 'lfm-2-gguf'
  readonly assetSource: TextModelAssetSource
  readonly quantization: 'q4_0'
  readonly repositoryId: string
  readonly tokenizerSubfolder: string
  readonly weightFile: string
}

export type TextModelImplementation =
  | TransformersTextModelImplementation
  | GgufTextModelImplementation

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

const POMO_R2_TEXT_MODEL_PATH_TEMPLATE = 'models/text-generation/{model}/{revision}/'

const createPomoR2ModelSource = (revision: string): TextModelAssetSource => ({
  host: POMO_R2_ASSET_HOST,
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
  'lfm-2.6b-qad': {
    architecture: 'lfm-2-gguf',
    assetSource: createPomoR2ModelSource('e7caca5d835a3901a8e0d63e94009429bafafdfc'),
    description: 'QAD Q4_0 경량화 모델의 한국어 표현 비교용',
    downloadSize: '약 1.6GB',
    id: 'lfm-2.6b-qad',
    label: 'LFM2.5-2.6B QAD Q4_0',
    quantization: 'q4_0',
    repositoryId: 'LiquidAI/LFM2.5-2.6B-GGUF',
    tokenizerSubfolder: 'qad',
    weightFile: 'LFM2.5-2.6B-QAD-Q4_0.gguf',
  },
}

const createDevelopmentTextModels = (): Partial<Record<TextModelId, TextModelImplementation>> => ({
  'lfm-1.2b': {
    architecture: 'lfm-2',
    assetSource: HUGGING_FACE_MODEL_SOURCE,
    description: '경량 다국어 모델의 한국어 표현 비교용',
    downloadSize: '약 1.2GB',
    id: 'lfm-1.2b',
    label: 'LFM2.5-1.2B Instruct',
    quantization: 'q4',
    repositoryId: 'LiquidAI/LFM2.5-1.2B-Instruct-ONNX',
  },
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
