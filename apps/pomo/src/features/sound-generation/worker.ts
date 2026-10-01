import {getExceptionMessage} from 'src/features/error-detail'
/// <reference lib="webworker" />
import {generateSound} from './runtime'
import {generateExtendedSound} from './extension'
import {generateLoopSound} from './loop'
import type {LoopRequest, SoundMessage, SoundRequest} from './types'
export type {
  LoopRequest,
  SoundMessage,
  SoundRequest,
  SoundProgressMessage,
  SoundErrorMessage,
  SoundResultMessage,
} from './types'
const scope = globalThis.self as DedicatedWorkerGlobalScope
const IN_FLIGHT_ERROR_MESSAGE = '이미 환경음을 생성하고 있습니다.'
let inFlight = false
scope.onmessage = async (event: MessageEvent<SoundRequest | LoopRequest>) => {
  const send = (message: SoundMessage) => scope.postMessage(message)
  if (inFlight) {
    send({message: IN_FLIGHT_ERROR_MESSAGE, type: 'error'})
    return
  }
  inFlight = true
  try {
    const progress = (message: string) => send({message, type: 'progress'})
    if ('type' in event.data) {
      const blob = await generateLoopSound(
        event.data.source,
        event.data.prompt,
        progress,
        event.data.connectionSeconds,
      )
      send({blob, type: 'result'})
      return
    }
    const blob =
      event.data.inpaint === undefined
        ? await generateExtendedSound(event.data.prompt, event.data.seconds, progress, {
            chunkNoiseMode: event.data.chunkNoiseMode,
            connectionSeconds: event.data.connectionSeconds,
            negativePrompt: event.data.negativePrompt,
          })
        : await generateSound(event.data.prompt, event.data.seconds, progress, {
            inpaint: event.data.inpaint,
            negativePrompt: event.data.negativePrompt,
          })
    send({blob, type: 'result'})
  } catch (error) {
    send({message: getExceptionMessage(error, () => String(error)), type: 'error'})
  } finally {
    inFlight = false
  }
}
