export type TranscriptionModel = 'buzzasr-korean-q8'
export type DictationState = 'idle' | 'waiting' | 'starting' | 'recording' | 'transcribing'

export interface DictationPreferences {
  readonly model: TranscriptionModel
  readonly vad: boolean
}
