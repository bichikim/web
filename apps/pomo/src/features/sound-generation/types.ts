import type {InpaintAudio} from './inpaint'
import type {ChunkNoiseMode} from './noise'

export interface SoundRequest {
  readonly negativePrompt?: string
  readonly prompt: string
  readonly seconds: number
  readonly inpaint?: InpaintAudio
  readonly connectionSeconds?: number
  readonly chunkNoiseMode?: ChunkNoiseMode
}
export interface LoopRequest {
  readonly type: 'loop'
  readonly source: Blob
  readonly prompt: string
  readonly connectionSeconds?: number
}
export interface SoundProgressMessage {
  readonly type: 'progress'
  readonly message: string
}
export interface SoundErrorMessage {
  readonly type: 'error'
  readonly message: string
}
export interface SoundResultMessage {
  readonly type: 'result'
  readonly blob: Blob
}
export type SoundMessage = SoundProgressMessage | SoundErrorMessage | SoundResultMessage

export interface SoundWorker {
  onmessage?: ((event: MessageEvent<SoundMessage>) => void) | null
  onerror?: ((event: ErrorEvent) => void) | null
  readonly postMessage: (request: SoundRequest | LoopRequest) => void
  readonly terminate: () => void
}
