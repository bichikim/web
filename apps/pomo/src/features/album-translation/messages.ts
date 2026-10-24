import type {
  TextGenerationErrorResponse,
  TextGenerationLoadingResponse,
  TextGenerationSkippedResponse,
} from '../text-generation/messages'

export interface AlbumTranslationText {
  readonly description: string
  readonly title: string
}

export interface TranslateAlbumRequest {
  readonly description: string
  readonly title: string
  readonly type: 'translate'
}

export interface AlbumTranslationStartedResponse {
  readonly type: 'started'
}

export interface AlbumTranslationCompleteResponse {
  readonly translations: {
    readonly en: AlbumTranslationText
    readonly ja: AlbumTranslationText
    readonly 'zh-Hans': AlbumTranslationText
  }
  readonly type: 'complete'
}

export type AlbumTranslationWorkerRequest = TranslateAlbumRequest

export type AlbumTranslationWorkerResponse =
  | TextGenerationSkippedResponse<AlbumTranslationWorkerRequest>
  | AlbumTranslationCompleteResponse
  | AlbumTranslationStartedResponse
  | TextGenerationErrorResponse
  | TextGenerationLoadingResponse
