export interface SupertonicModelFile {
  readonly key: 'durationPredictor' | 'textEncoder' | 'vectorEstimator' | 'vocoder'
  readonly name: string
  readonly path: string
  readonly size: number
}

export interface SupertonicModel {
  readonly baseUrl: string
  readonly description: string
  readonly files: ReadonlyArray<SupertonicModelFile>
  readonly id: 'full' | 'int8'
  readonly label: string
  readonly preferredBackend: 'wasm' | 'webgpu'
  readonly size: number
  readonly speechPolicy: SupertonicSpeechPolicy
}

export interface SupertonicSpeechPolicy {
  readonly considerSplitLength: number
  readonly locale: string
  readonly maximumLength: number
  readonly recommendedLength: number
  readonly silenceDuration: number
}

export interface SupertonicVoice {
  readonly gender: 'female' | 'male'
  readonly id: string
  readonly label: string
  readonly recommended: boolean
}

const FULL_MODEL_REVISION = '3cadd1e'
const FULL_MODEL_BASE_URL = `https://huggingface.co/Supertone/supertonic-3/resolve/${FULL_MODEL_REVISION}`
const INT8_MODEL_REVISION = 'cca5a0e6c96e1d2c720986bf7e75fcc81dee3ae4'
const INT8_MODEL_BASE_URL = `https://huggingface.co/csukuangfj2/sherpa-onnx-supertonic-3-tts-int8-2026-05-11/resolve/${INT8_MODEL_REVISION}`

export const getSupertonicAssetUrl = (path: string) => `${FULL_MODEL_BASE_URL}/${path}`

export const SUPERTONIC_VOICES = [
  {
    gender: 'female',
    id: 'Yuna',
    label: 'Yuna',
    recommended: true,
  },
  {
    gender: 'female',
    id: 'F1',
    label: 'Sarah',
    recommended: false,
  },
  {
    gender: 'female',
    id: 'F2',
    label: 'Lily',
    recommended: false,
  },
  {
    gender: 'female',
    id: 'F3',
    label: 'Jessica',
    recommended: false,
  },
  {
    gender: 'female',
    id: 'F4',
    label: 'Olivia',
    recommended: false,
  },
  {
    gender: 'female',
    id: 'F5',
    label: 'Emily',
    recommended: false,
  },
  {
    gender: 'male',
    id: 'M1',
    label: 'Alex',
    recommended: false,
  },
  {
    gender: 'male',
    id: 'M2',
    label: 'James',
    recommended: false,
  },
  {
    gender: 'male',
    id: 'M3',
    label: 'Robert',
    recommended: false,
  },
  {
    gender: 'male',
    id: 'M4',
    label: 'Sam',
    recommended: false,
  },
  {
    gender: 'male',
    id: 'M5',
    label: 'Daniel',
    recommended: false,
  },
] as const satisfies ReadonlyArray<SupertonicVoice>

export type SupertonicVoiceId = (typeof SUPERTONIC_VOICES)[number]['id']
export type SupertonicModelId = (typeof SUPERTONIC_MODELS)[number]['id']

// 120 is Supertonic's Korean auto-chunk value; 150/200 reflect observed browser quality degradation before outright failure.
const KOREAN_SPEECH_POLICY: SupertonicSpeechPolicy = {
  considerSplitLength: 120,
  locale: 'ko',
  maximumLength: 200,
  recommendedLength: 150,
  silenceDuration: 0.3,
}

const FULL_MODEL_FILES: ReadonlyArray<SupertonicModelFile> = [
  {
    key: 'durationPredictor',
    name: '발음 길이 모델',
    path: 'onnx/duration_predictor.onnx',
    size: 3_700_147,
  },
  {
    key: 'textEncoder',
    name: '텍스트 모델',
    path: 'onnx/text_encoder.onnx',
    size: 36_416_150,
  },
  {
    key: 'vectorEstimator',
    name: '음성 생성 모델',
    path: 'onnx/vector_estimator.onnx',
    size: 256_534_781,
  },
  {
    key: 'vocoder',
    name: '보코더',
    path: 'onnx/vocoder.onnx',
    size: 101_424_195,
  },
]

const INT8_MODEL_FILES: ReadonlyArray<SupertonicModelFile> = [
  {
    key: 'durationPredictor',
    name: '발음 길이 모델',
    path: 'duration_predictor.int8.onnx',
    size: 3_700_147,
  },
  {
    key: 'textEncoder',
    name: '텍스트 모델',
    path: 'text_encoder.int8.onnx',
    size: 36_416_150,
  },
  {
    key: 'vectorEstimator',
    name: '음성 생성 모델',
    path: 'vector_estimator.int8.onnx',
    size: 78_400_833,
  },
  {
    key: 'vocoder',
    name: '보코더',
    path: 'vocoder.int8.onnx',
    size: 25_991_073,
  },
]

const getModelSize = (files: ReadonlyArray<SupertonicModelFile>) =>
  files.reduce((total, file) => total + file.size, 0)

// Keep both profiles: product decisions need side-by-side quality and latency evidence, not a forced quantized migration.
export const SUPERTONIC_MODELS = [
  {
    baseUrl: FULL_MODEL_BASE_URL,
    description: '원본 품질 · WebGPU 우선',
    files: FULL_MODEL_FILES,
    id: 'full',
    label: 'Full',
    preferredBackend: 'webgpu',
    size: getModelSize(FULL_MODEL_FILES),
    speechPolicy: KOREAN_SPEECH_POLICY,
  },
  {
    baseUrl: INT8_MODEL_BASE_URL,
    description: '작은 용량 · WASM 실행',
    files: INT8_MODEL_FILES,
    id: 'int8',
    label: 'INT8',
    preferredBackend: 'wasm',
    size: getModelSize(INT8_MODEL_FILES),
    speechPolicy: KOREAN_SPEECH_POLICY,
  },
] as const satisfies ReadonlyArray<SupertonicModel>

export const getSupertonicModel = (modelId: SupertonicModelId): SupertonicModel => {
  const model = SUPERTONIC_MODELS.find((item) => item.id === modelId)

  if (model === undefined) {
    throw new Error(`지원하지 않는 Supertonic 모델입니다: ${modelId}`)
  }

  return model
}

export const getSupertonicModelFileUrl = (model: SupertonicModel, file: SupertonicModelFile) =>
  `${model.baseUrl}/${file.path}`

export const SUPERTONIC_ORT_WASM_URL = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.2/dist/'
