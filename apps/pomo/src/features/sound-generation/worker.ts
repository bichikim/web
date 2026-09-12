/// <reference lib="webworker" />
import {generateSound} from './runtime'
import {generateExtendedSound} from './extension'
import {generateLoopSound} from './loop'
import type {InpaintAudio} from './inpaint'

export interface SoundRequest {
  readonly prompt: string
  readonly seconds: number
  readonly inpaint?: InpaintAudio
  readonly overlapSeconds?: number
}
export interface LoopRequest {
  readonly type: 'loop'
  readonly source: Blob
  readonly prompt: string
  readonly transitionSeconds?: number
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
const scope = self as DedicatedWorkerGlobalScope
scope.onmessage = async (event: MessageEvent<SoundRequest | LoopRequest>) => {
  const send = (message: SoundMessage) => scope.postMessage(message)
  try {
    const progress = (message: string) => send({message, type: 'progress'})
    if ('type' in event.data) {
      const blob = await generateLoopSound(
        event.data.source,
        event.data.prompt,
        progress,
        event.data.transitionSeconds,
      )
      send({blob, type: 'result'})
      return
    }
    const blob =
      event.data.inpaint === undefined
        ? await generateExtendedSound(
            event.data.prompt,
            event.data.seconds,
            progress,
            event.data.overlapSeconds,
          )
        : await generateSound(event.data.prompt, event.data.seconds, progress, event.data.inpaint)
    send({blob, type: 'result'})
  } catch (error) {
    send({message: error instanceof Error ? error.message : String(error), type: 'error'})
  }
}
