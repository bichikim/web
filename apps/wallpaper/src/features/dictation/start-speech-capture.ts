import {createMicrophoneMeter} from './create-microphone-meter'

export interface SpeechCapture {
  readonly stop: () => void
  readonly audio: Promise<Float32Array>
}
const SAMPLE_RATE = 16_000
const MAXIMUM_DURATION = 60_000
const CAPTURE_TIMESLICE = 1000

const decode = async (recording: Blob): Promise<Float32Array> => {
  const context = new AudioContext()
  try {
    const buffer = await context.decodeAudioData(await recording.arrayBuffer())
    const rendered = new OfflineAudioContext(
      1,
      Math.max(1, Math.ceil(buffer.duration * SAMPLE_RATE)),
      SAMPLE_RATE,
    )
    const source = rendered.createBufferSource()
    source.buffer = buffer
    source.connect(rendered.destination)
    source.start()
    return new Float32Array((await rendered.startRendering()).getChannelData(0))
  } finally {
    await context.close()
  }
}

/** Captures the microphone until stopped; abort and failures always release every media track. */
export const startSpeechCapture = async (
  signal: AbortSignal,
  onLevel?: (level: number) => void,
): Promise<SpeechCapture> => {
  signal.throwIfAborted()
  if (
    typeof navigator.mediaDevices?.getUserMedia !== 'function' ||
    typeof MediaRecorder === 'undefined'
  ) {
    throw new Error('이 환경에서는 마이크를 사용할 수 없어요.')
  }
  const stream = await navigator.mediaDevices
    .getUserMedia({audio: {noiseSuppression: false}})
    .catch(() => {
      throw new Error('마이크 권한과 입력 장치를 확인해 주세요.')
    })
  const release = () => stream.getTracks().forEach((track) => track.stop())
  if (signal.aborted) {
    release()
    signal.throwIfAborted()
  }
  let cleanup = release
  let stopMeter: (() => void) | undefined
  try {
    const mimeType = ['audio/webm;codecs=opus', 'audio/mp4'].find((type) =>
      MediaRecorder.isTypeSupported(type),
    )
    const recorder = new MediaRecorder(stream, mimeType === undefined ? undefined : {mimeType})
    const chunks: Blob[] = []
    const result = Promise.withResolvers<Float32Array>()
    // Capture errors can precede the caller receiving the capture handle.
    result.promise.catch(() => undefined)
    let settled = false
    const stop = () => {
      if (recorder.state !== 'inactive') {
        recorder.stop()
      }
    }
    const clean = () => {
      if (settled) {
        return
      }
      settled = true
      signal.removeEventListener('abort', abort)
      stream.getTracks().forEach((track) => track.removeEventListener('ended', interrupted))
      stopMeter?.()
      release()
    }
    cleanup = clean
    const abort = () => {
      clean()
      stop()
      result.reject(signal.reason ?? new DOMException('Cancelled', 'AbortError'))
    }
    const interrupted = () => {
      if (!settled) {
        clean()
        stop()
        result.reject(new Error('녹음이 중단됐어요. 다시 시도해 주세요.'))
      }
    }
    recorder.addEventListener('dataavailable', (event) => {
      if (!settled && event.data.size > 0) {
        chunks.push(event.data)
        if (event.timecode >= MAXIMUM_DURATION) {
          stop()
        }
      }
    })
    recorder.addEventListener('error', interrupted, {once: true})
    recorder.addEventListener(
      'stop',
      () => {
        if (!settled) {
          clean()
          const recording = new Blob(chunks, {type: recorder.mimeType})
          if (recording.size === 0) {
            result.resolve(new Float32Array())
          } else {
            decode(recording).then(result.resolve, result.reject)
          }
        }
      },
      {once: true},
    )
    signal.addEventListener('abort', abort, {once: true})
    stream
      .getTracks()
      .forEach((track) => track.addEventListener('ended', interrupted, {once: true}))
    if (onLevel !== undefined) {
      stopMeter = createMicrophoneMeter({onError: interrupted, onLevel, stream})
    }
    recorder.start(CAPTURE_TIMESLICE)
    return {audio: result.promise, stop}
  } catch (cause) {
    cleanup()
    throw cause
  }
}
