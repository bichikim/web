import type {MicVAD} from '@ricky0123/vad-web'
import {createMicrophoneMeter} from './create-microphone-meter'
import type {SpeechCapture} from './start-speech-capture'

const SAMPLE_RATE = 16_000
const MAXIMUM_SECONDS = 60
const MAXIMUM_SAMPLES = SAMPLE_RATE * MAXIMUM_SECONDS
const reportCleanup = (cause: unknown) => console.warn('Speech detector cleanup failed', cause)

const openMicrophone = async (signal: AbortSignal) => {
  signal.throwIfAborted()
  if (typeof navigator.mediaDevices?.getUserMedia !== 'function') {
    throw new Error('이 환경에서는 마이크를 사용할 수 없어요.')
  }
  const stream = await navigator.mediaDevices
    .getUserMedia({audio: {noiseSuppression: false}})
    .catch((cause: unknown) => {
      throw new Error('마이크 권한과 입력 장치를 확인해 주세요.', {cause})
    })
  try {
    signal.throwIfAborted()
    return {context: new AudioContext(), stream}
  } catch (cause) {
    stream.getTracks().forEach((track) => track.stop())
    throw cause
  }
}

/** Captures one 16kHz utterance using bundled Silero; silence alone never produces a turn. */
export const startSpeechTurn = async (
  signal: AbortSignal,
  onLevel?: (level: number) => void,
): Promise<SpeechCapture> => {
  const {context, stream} = await openMicrophone(signal)
  const release = () => stream.getTracks().forEach((track) => track.stop())
  const result = Promise.withResolvers<Float32Array>()
  result.promise.catch(() => undefined)
  let detector: MicVAD | null = null
  let stopMeter: (() => void) | undefined
  let settled = false
  let ready = false
  let samples = 0
  let speaking = false
  const disconnect = () => {
    stopMeter?.()
    stopMeter = undefined
    release()
    stream.getTracks().forEach((track) => track.removeEventListener('ended', interrupted))
  }
  const dispose = async () => {
    signal.removeEventListener('abort', abort)
    disconnect()
    try {
      await detector?.destroy()
    } catch (cause) {
      reportCleanup(cause)
    } finally {
      await context.close()
    }
  }
  const finish = (audio: Float32Array) => {
    if (!settled) {
      settled = true
      disconnect()
      dispose().then(() => result.resolve(audio), result.reject)
    }
  }
  const fail = (cause: unknown) => {
    if (!settled) {
      settled = true
      disconnect()
      result.reject(cause)
      if (ready) {
        dispose().catch(reportCleanup)
      }
    }
  }
  const abort = () => fail(signal.reason ?? new DOMException('Cancelled', 'AbortError'))
  const interrupted = () => fail(new Error('마이크 연결을 확인해 주세요.'))
  signal.addEventListener('abort', abort, {once: true})
  stream.getTracks().forEach((track) => track.addEventListener('ended', interrupted, {once: true}))
  try {
    signal.throwIfAborted()
    await context.resume()
    const {MicVAD: Detector} = await import('@ricky0123/vad-web')
    const assets = new URL('dictation-runtime/', document.baseURI).href
    detector = await Detector.new({
      audioContext: context,
      baseAssetPath: assets,
      getStream: async () => stream,
      minSpeechMs: 300,
      model: 'v5',
      negativeSpeechThreshold: 0.35,
      onFrameProcessed: (_probabilities, frame) => {
        if (speaking && !settled) {
          samples += frame.length
          if (samples >= MAXIMUM_SAMPLES && detector !== null) {
            detector.setOptions({submitUserSpeechOnPause: true})
            detector.pause().catch(fail)
          }
        }
      },
      onnxWASMBasePath: assets,
      onSpeechEnd: (audio) => finish(audio.slice(0, MAXIMUM_SAMPLES)),
      onSpeechStart: () => {
        speaking = true
        samples = 0
      },
      onVADMisfire: () => {
        speaking = false
        samples = 0
      },
      ortConfig: (runtime) => {
        runtime.env.wasm.numThreads = 1
      },
      positiveSpeechThreshold: 0.5,
      preSpeechPadMs: 400,
      redemptionMs: 1400,
      startOnLoad: false,
      submitUserSpeechOnPause: false,
    })
    await detector.start()
    ready = true
    if (settled) {
      await dispose()
      signal.throwIfAborted()
      throw new Error('마이크 연결을 확인해 주세요.')
    }
    if (onLevel !== undefined) {
      stopMeter = createMicrophoneMeter({onError: fail, onLevel, stream})
    }
    const stop = () => {
      if (!settled && detector !== null) {
        detector.setOptions({submitUserSpeechOnPause: true})
        detector.pause().then(() => finish(new Float32Array()), fail)
      }
    }
    return {audio: result.promise, stop}
  } catch (cause) {
    if (!ready) {
      await dispose()
    } else if (!settled) {
      fail(cause)
    }
    throw cause
  }
}
