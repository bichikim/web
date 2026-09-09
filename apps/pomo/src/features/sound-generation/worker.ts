/// <reference lib="webworker" />
import {generateSound} from './runtime'

export interface SoundRequest {
  readonly prompt: string
  readonly seconds: number
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
scope.onmessage = async (event: MessageEvent<SoundRequest>) => {
  const send = (message: SoundMessage) => scope.postMessage(message)
  try {
    const blob = await generateSound(event.data.prompt, event.data.seconds, (message) =>
      send({message, type: 'progress'}),
    )
    send({blob, type: 'result'})
  } catch (error) {
    send({message: error instanceof Error ? error.message : String(error), type: 'error'})
  }
}
