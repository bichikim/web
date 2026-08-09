import type {SupertonicError} from './errors'
import type {SupertonicModelId, SupertonicVoiceId} from './model'

export interface SupertonicProgress {
  readonly fileName: string
  readonly loadedBytes: number
  readonly totalBytes: number
}

export interface SupertonicAudio {
  readonly generationTime: number
  readonly sampleRate: number
  readonly samples: Float32Array
}

export interface SupertonicAudioChunk extends SupertonicAudio {
  readonly index: number
  readonly total: number
}

export type SupertonicGenerationEvent =
  | {readonly audio: SupertonicAudioChunk; readonly type: 'chunk'}
  | {readonly audio: SupertonicAudio; readonly type: 'complete'}

export type SupertonicWorkerInput =
  | {readonly modelId: SupertonicModelId; readonly type: 'initialize'}
  | {
      readonly requestId: number
      readonly speed: number
      readonly text: string
      readonly type: 'generate'
      readonly voiceId: SupertonicVoiceId
    }
  | {readonly type: 'dispose'}

export type SupertonicWorkerOutput =
  | {readonly progress: SupertonicProgress; readonly type: 'progress'}
  | {readonly backend: 'wasm' | 'webgpu'; readonly type: 'ready'}
  | {
      readonly generationTime: number
      readonly index: number
      readonly requestId: number
      readonly sampleRate: number
      readonly samples: Float32Array
      readonly total: number
      readonly type: 'chunk'
    }
  | {
      readonly generationTime: number
      readonly requestId: number
      readonly sampleRate: number
      readonly samples: Float32Array
      readonly type: 'result'
    }
  | {readonly error: SupertonicError; readonly requestId: number | null; readonly type: 'error'}
  | {readonly message: string; readonly type: 'status'}
  | {readonly type: 'disposed'}
