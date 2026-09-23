// Vite provides the default URL export for worker assets.
// oxlint-disable-next-line import/default
import processorUrl from './speech-end-processor.ts?worker&url'
export {createSpeechEndState} from './speech-end-state'
export type {SpeechEndSample, SpeechEndState} from './speech-end-state'

export interface SpeechEndDetector {
  readonly dispose: () => void
  readonly subscribe: (onSpeechEnd: () => void) => () => void
}

/** Observes microphone activity without playing microphone audio. */
export const createBrowserSpeechEndDetector = (stream: MediaStream): SpeechEndDetector | null => {
  if (typeof AudioContext === 'undefined' || typeof AudioWorkletNode === 'undefined') {
    return null
  }
  let context: AudioContext
  try {
    context = new AudioContext()
  } catch {
    return null
  }
  let disposed = false
  let source: MediaStreamAudioSourceNode | undefined
  let processor: AudioWorkletNode | undefined
  const listeners = new Set<() => void>()
  const dispose = () => {
    if (disposed) {
      return
    }
    disposed = true
    listeners.clear()
    source?.disconnect()
    if (processor !== undefined) {
      processor.port.onmessage = null
      processor.port.close()
      processor.disconnect()
    }
    context.close().catch(() => undefined)
  }
  const initialize = async () => {
    await context.audioWorklet.addModule(processorUrl)
    if (disposed) {
      return
    }
    processor = new AudioWorkletNode(context, 'speech-end', {numberOfOutputs: 0})
    processor.port.onmessage = (event: MessageEvent<unknown>) => {
      if (!disposed && event.data === 'speech-end') {
        for (const listener of listeners) {
          listener()
        }
      }
    }
    processor.onprocessorerror = dispose
    source = context.createMediaStreamSource(stream)
    source.connect(processor)
    await context.resume()
  }
  initialize().catch(dispose)
  return {
    dispose,
    subscribe: (onSpeechEnd) => {
      listeners.add(onSpeechEnd)
      return () => listeners.delete(onSpeechEnd)
    },
  }
}
