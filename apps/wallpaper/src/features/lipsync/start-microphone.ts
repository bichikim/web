import captureUrl from '../voice/capture.worklet.ts?worker&url'
import type {VoiceAudio} from '../voice/synthesis'

interface StartMicrophoneOptions {
  /** Exact saved input device; empty string follows the system default. */
  readonly deviceId: string
  /** Aborting releases the stream, including a permission request that resolves late. */
  readonly signal: AbortSignal
  /** Receives bounded mono PCM windows; no recorded audio is retained or played. */
  readonly onFrame: (audio: VoiceAudio) => void
  /** Reports a disconnected input or processor failure after capture starts. */
  readonly onError: (cause: unknown) => void
}
const reportClose = (cause: unknown) => console.warn('Microphone cleanup failed', cause)

/** Opens continuous local PCM capture and returns an idempotent resource release function. */
export const startMicrophone = async (options: StartMicrophoneOptions): Promise<() => void> => {
  options.signal.throwIfAborted()
  if (typeof navigator.mediaDevices?.getUserMedia !== 'function') {
    throw new Error('이 환경에서는 마이크를 사용할 수 없어요.')
  }
  const stream = await navigator.mediaDevices
    .getUserMedia({
      audio: {
        autoGainControl: false,
        ...(options.deviceId === '' ? {} : {deviceId: {exact: options.deviceId}}),
        echoCancellation: false,
        noiseSuppression: false,
      },
    })
    .catch((cause: unknown) => {
      throw new Error('마이크 권한과 입력 장치를 확인해 주세요.', {cause})
    })
  const tracks = stream.getTracks()
  if (options.signal.aborted) {
    tracks.forEach((track) => track.stop())
    options.signal.throwIfAborted()
  }
  let context: AudioContext | null = null
  let input: MediaStreamAudioSourceNode | null = null
  let processor: AudioWorkletNode | null = null
  let stopped = false
  const stop = () => {
    if (stopped) {
      return
    }
    stopped = true
    options.signal.removeEventListener('abort', stop)
    tracks.forEach((track) => {
      track.removeEventListener('ended', interrupted)
      track.stop()
    })
    input?.disconnect()
    if (processor !== null) {
      processor.port.onmessage = null
      processor.onprocessorerror = null
      processor.disconnect()
    }
    context?.close().catch(reportClose)
  }
  const interrupted = () => {
    if (!stopped) {
      stop()
      options.onError(new Error('마이크 연결을 확인해 주세요.'))
    }
  }
  options.signal.addEventListener('abort', stop, {once: true})
  tracks.forEach((track) => track.addEventListener('ended', interrupted, {once: true}))
  try {
    context = new AudioContext()
    await context.audioWorklet.addModule(captureUrl)
    options.signal.throwIfAborted()
    if (stopped) {
      throw new Error('마이크 연결을 확인해 주세요.')
    }
    input = context.createMediaStreamSource(stream)
    processor = new AudioWorkletNode(context, 'poffo-speech-capture')
    processor.onprocessorerror = interrupted
    processor.port.onmessage = (event: MessageEvent<VoiceAudio>) => {
      if (!stopped) {
        options.onFrame(event.data)
      }
    }
    // The processor emits PCM messages and leaves its speaker output silent.
    input.connect(processor).connect(context.destination)
    await context.resume()
    options.signal.throwIfAborted()
    if (stopped) {
      throw new Error('마이크 연결을 확인해 주세요.')
    }
    return stop
  } catch (cause) {
    stop()
    throw cause
  }
}
