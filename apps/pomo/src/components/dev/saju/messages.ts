import type {TextGenerationMessage, TextGenerationProgress} from 'src/features/text-generation'

export interface SajuAnswerFacts {
  readonly birthYear: number
}

export interface GenerateSajuRequest {
  readonly facts: SajuAnswerFacts
  readonly fallbackAnswer: string | null
  readonly messages: ReadonlyArray<TextGenerationMessage>
  readonly type: 'generate'
}

export type SajuWorkerResponse =
  | ({readonly type: 'loading'} & TextGenerationProgress)
  | {readonly type: 'started'}
  | {readonly source: 'calculation' | 'model'; readonly text: string; readonly type: 'complete'}
  | {readonly message: string; readonly type: 'error'}
