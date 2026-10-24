import type {TextGenerationSkippedResponse} from '../text-generation/messages'
import type {TextGenerationMessage, TextGenerationProgress} from 'src/features/text-generation'

export interface GenerateSajuRequest {
  readonly messages: ReadonlyArray<TextGenerationMessage>
  readonly type: 'generate'
}

export type SajuWorkerResponse =
  | TextGenerationSkippedResponse<GenerateSajuRequest>
  | ({readonly type: 'loading'} & TextGenerationProgress)
  | {readonly type: 'started'}
  | {readonly text: string; readonly type: 'complete'}
  | {readonly message: string; readonly type: 'error'}
