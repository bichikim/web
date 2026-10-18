import type {DefaultTextModelId} from 'src/features/text-generation/settings'
import type {GenerateSajuRequest} from './messages'

export interface SajuGenerateRequest extends GenerateSajuRequest {
  readonly modelId: DefaultTextModelId
  readonly requestId: string
}

export type SajuGenerationResponse =
  | {readonly percentage: number; readonly requestId: string; readonly type: 'progress'}
  | {readonly requestId: string; readonly type: 'started'}
  | {
      readonly requestId: string
      readonly text: string
      readonly type: 'complete'
    }
  | {readonly message: string; readonly requestId: string; readonly type: 'error'}
