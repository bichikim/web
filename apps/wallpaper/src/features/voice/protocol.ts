import type {PoffoVoice} from '@winter-love/wallpaper/settings/voice'

export interface SynthesisRequest {
  readonly type: 'generate'
  readonly id: number
  readonly text: string
  readonly voice: PoffoVoice
}
export type SynthesisReply =
  | {readonly id: number; readonly type: 'status'; readonly status: 'download' | 'generating'}
  | {
      readonly id: number
      readonly type: 'audio'
      readonly samples: Float32Array
      readonly sampleRate: number
    }
  | {readonly id: number; readonly type: 'error'; readonly message: string}

export type SynthesisCommand = SynthesisRequest | {readonly type: 'cancel'; readonly id: number}
