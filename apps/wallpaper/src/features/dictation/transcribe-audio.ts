import {invoke, isTauri} from '@tauri-apps/api/core'

import type {TranscriptionModel} from './types'

interface TranscribeAudioOptions {
  /** Mono PCM at 16 kHz; the caller retains the samples. */
  readonly audio: Float32Array
  /** Local recognition model used for this recording. */
  readonly model: TranscriptionModel
  /** Cancels inference and terminates its native process. */
  readonly signal: AbortSignal
  /** Runs Silero speech segmentation when true; does not remove noise. */
  readonly vad: boolean
}

const describeError = (cause: unknown): string => {
  switch (cause) {
    case 'runtimeMissing':
      return '음성 인식 실행기가 없어요. 앱을 다시 빌드해 주세요.'
    case 'invalidRequest':
      return '녹음된 소리를 확인해 주세요.'
    case 'busy':
      return '다른 음성을 인식하고 있어요.'
    default:
      return '음성 인식에 실패했어요. 모델 다운로드와 실행 환경을 확인해 주세요.'
  }
}

/** Transcribes on-device with the bundled native runtime; never substitutes another model. */
export const transcribeAudio = async (options: TranscribeAudioOptions): Promise<string> => {
  options.signal.throwIfAborted()
  if (!isTauri()) {
    throw new Error('음성 입력은 Wallpaper 데스크톱 앱에서 사용할 수 있어요.')
  }
  const id = crypto.randomUUID()
  const result = Promise.withResolvers<string>()
  const cancel = () => {
    invoke('cancel_local_transcription', {id}).catch((cause: unknown) => {
      console.warn('Local transcription cancellation failed', cause)
    })
    result.reject(options.signal.reason ?? new DOMException('Cancelled', 'AbortError'))
  }
  options.signal.addEventListener('abort', cancel, {once: true})
  try {
    invoke<string>('transcribe_local_audio', {
      request: {audio: Array.from(options.audio), id, model: options.model, vad: options.vad},
    }).then(result.resolve, result.reject)
    const text = await result.promise
    options.signal.throwIfAborted()
    return text
  } catch (cause) {
    options.signal.throwIfAborted()
    throw new Error(describeError(cause), {cause})
  } finally {
    options.signal.removeEventListener('abort', cancel)
  }
}
