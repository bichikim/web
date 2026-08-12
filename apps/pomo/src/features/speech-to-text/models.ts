export type SpeechModelFamily = 'moonshine' | 'whisper'
export type SpeechModelId = 'moonshine-tiny-ko' | 'whisper-base' | 'whisper-tiny'

export interface SpeechModelDefinition {
  readonly description: string
  readonly family: SpeechModelFamily
  readonly id: SpeechModelId
  readonly label: string
  readonly repositoryId: string
  readonly sizeLabel: string
  readonly speedLabel: string
}

export const DEFAULT_SPEECH_MODEL_ID: SpeechModelId = 'whisper-tiny'
export const RECOMMENDED_SPEECH_MODEL_ID: SpeechModelId = 'moonshine-tiny-ko'

export const SPEECH_MODELS: ReadonlyArray<SpeechModelDefinition> = [
  {
    description: '한국어에 특화된 경량 모델로 여러 브라우저에서 먼저 시험하기 좋아요.',
    family: 'moonshine',
    id: 'moonshine-tiny-ko',
    label: 'Moonshine Tiny KO',
    repositoryId: 'onnx-community/moonshine-tiny-ko-ONNX',
    sizeLabel: '27M 파라미터',
    speedLabel: '가장 빠름',
  },
  {
    description: '다국어를 지원하는 기존 기준 모델로 속도와 호환성이 안정적이에요.',
    family: 'whisper',
    id: 'whisper-tiny',
    label: 'Whisper Tiny',
    repositoryId: 'onnx-community/whisper-tiny',
    sizeLabel: '39M 파라미터',
    speedLabel: '빠름',
  },
  {
    description: 'Tiny보다 한국어 정확도를 높여 비교할 때 쓰는 대신 다운로드와 처리가 더 무거워요.',
    family: 'whisper',
    id: 'whisper-base',
    label: 'Whisper Base',
    repositoryId: 'onnx-community/whisper-base',
    sizeLabel: '74M 파라미터',
    speedLabel: '정확도 우선',
  },
]

export const getSpeechModel = (modelId: SpeechModelId): SpeechModelDefinition => {
  const model = SPEECH_MODELS.find((candidate) => candidate.id === modelId)

  if (model === undefined) {
    throw new Error(`지원하지 않는 음성 인식 모델입니다: ${modelId}`)
  }

  return model
}
