import type {TextModelId} from '../text-generation/model'
import type {DrawnTarotCard, TarotLocale} from './cards'

export interface TarotGenerateRequest {
  readonly cards: ReadonlyArray<DrawnTarotCard>
  readonly modelId: TextModelId
  readonly locale: TarotLocale
  readonly question: string
  readonly requestId: string
  readonly type: 'generate'
}

export type TarotWorkerRequest = TarotGenerateRequest

export interface TarotProgressResponse {
  readonly percentage: number
  readonly requestId: string
  readonly type: 'progress'
}

export interface TarotStartedResponse {
  readonly requestId: string
  readonly type: 'started'
}

export interface TarotTokenResponse {
  readonly requestId: string
  readonly text: string
  readonly type: 'token'
}

export interface TarotCompleteResponse {
  readonly requestId: string
  readonly text: string
  readonly type: 'complete'
}

export interface TarotErrorResponse {
  readonly message: string
  readonly requestId: string
  readonly restartRequired: boolean
  readonly type: 'error'
}

export type TarotWorkerResponse =
  | TarotCompleteResponse
  | TarotErrorResponse
  | TarotProgressResponse
  | TarotStartedResponse
  | TarotTokenResponse
