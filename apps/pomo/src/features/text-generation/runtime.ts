import type {TextModelId} from './model'
import type {TextGenerationProgress} from './progress'

export interface TextGenerationMessage {
  readonly content: string
  readonly role: 'assistant' | 'system' | 'user'
}

export interface TextTokenVocabulary {
  readonly all_special_ids: ReadonlyArray<number>
  readonly decode: (
    tokenIds: Array<number>,
    options: {readonly skip_special_tokens: boolean},
  ) => string
  readonly get_vocab: () => Map<string, number>
}

export interface GenerateTextOptions {
  readonly maximumTokens: number
  readonly messages: Array<TextGenerationMessage>
  readonly noRepeatNgramSize: number
  readonly onToken?: (text: string) => void
  readonly repetitionPenalty: number
  readonly suppressedTokenIds?: Array<number>
  readonly temperature: number
  readonly topK: number
  readonly topP: number
}

export interface TextGenerationRuntime {
  readonly countTokens: (messages: Array<TextGenerationMessage>) => Promise<number>
  readonly generate: (options: GenerateTextOptions) => Promise<string>
  readonly getTokenizer: () => TextTokenVocabulary
  readonly prepare: (modelId: TextModelId) => Promise<void>
}

export interface CreateTextGenerationRuntimeOptions {
  readonly onProgress: (progress: TextGenerationProgress) => void
}
