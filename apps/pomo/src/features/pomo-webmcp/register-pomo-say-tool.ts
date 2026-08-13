import {SUPERTONIC_VOICES, type SupertonicVoiceId} from '../supertonic'

const MAXIMUM_TEXT_LENGTH = 3000

interface ModelContextTool {
  readonly annotations?: {
    readonly readOnlyHint?: boolean
  }
  readonly description: string
  readonly execute: (input: unknown) => Promise<unknown>
  readonly inputSchema: object
  readonly name: string
  readonly title: string
}

interface ModelContext {
  readonly registerTool: (
    tool: ModelContextTool,
    options?: {readonly signal?: AbortSignal},
  ) => Promise<void>
}

export interface PomoSayRequest {
  readonly text: string
  readonly voiceId?: SupertonicVoiceId
}

interface ParsedPomoSayRequest {
  readonly request: PomoSayRequest
  readonly voiceName: string
}

export interface RegisterPomoSayToolOptions {
  readonly document: Document
  readonly signal?: AbortSignal
  readonly speak: (request: PomoSayRequest) => Promise<void>
}

const isObject = (value: unknown): value is Record<PropertyKey, unknown> =>
  typeof value === 'object' && value !== null

const isModelContext = (value: unknown): value is ModelContext =>
  isObject(value) && typeof value.registerTool === 'function'

const getModelContext = (document: Document): ModelContext | null => {
  const modelContext: unknown = Reflect.get(document, 'modelContext')

  if (!isModelContext(modelContext)) {
    return null
  }

  return modelContext
}

const parsePomoSayRequest = (input: unknown): ParsedPomoSayRequest => {
  if (!isObject(input) || typeof input.text !== 'string') {
    throw new TypeError('pomo_say에는 text 문자열이 필요합니다.')
  }

  const text = input.text.trim()

  if (text.length === 0 || text.length > MAXIMUM_TEXT_LENGTH) {
    throw new RangeError(`text는 1자 이상 ${MAXIMUM_TEXT_LENGTH}자 이하여야 합니다.`)
  }

  const {voice} = input

  if (voice === undefined) {
    return {request: {text}, voiceName: 'Yuna'}
  }

  const selectedVoice =
    typeof voice === 'string'
      ? SUPERTONIC_VOICES.find((availableVoice) => availableVoice.label === voice)
      : undefined

  if (selectedVoice === undefined) {
    throw new TypeError('지원하지 않는 Pomo 목소리입니다.')
  }

  return {request: {text, voiceId: selectedVoice.id}, voiceName: selectedVoice.label}
}

/** Registers Pomo's speech capability when the current browser supports WebMCP. */
export const registerPomoSayTool = async (options: RegisterPomoSayToolOptions) => {
  const modelContext = getModelContext(options.document)

  if (modelContext === null) {
    return false
  }

  await modelContext.registerTool(
    {
      annotations: {readOnlyHint: false},
      description: 'Pomo가 전달받은 텍스트를 화면의 말풍선에 표시하고 선택한 목소리로 읽습니다.',
      execute: async (input) => {
        const {request, voiceName} = parsePomoSayRequest(input)
        await options.speak(request)
        return {spoken: true, voice: voiceName}
      },
      inputSchema: {
        additionalProperties: false,
        properties: {
          text: {maxLength: MAXIMUM_TEXT_LENGTH, minLength: 1, type: 'string'},
          voice: {
            description: 'Pomo가 사용할 목소리 이름입니다. 생략하면 Yuna를 사용합니다.',
            enum: SUPERTONIC_VOICES.map((voice) => voice.label),
            type: 'string',
          },
        },
        required: ['text'],
        type: 'object',
      },
      name: 'pomo_say',
      title: 'Pomo가 말하기',
    },
    {signal: options.signal},
  )

  return true
}
