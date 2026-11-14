import {sampleMouthTrack} from './mouth-track'
import type {MouthPose, SpeechAudioContext, SpeechFrames, SpeechMouthTrack} from './types'

interface PlaySpeechAudioOptions {
  /** 입 모양 프레임을 예약하며 종료·취소 시 예약을 해제한다. */
  readonly frames: SpeechFrames
  /** 재생할 디코딩된 음성 버퍼다. */
  readonly audio: AudioBuffer
  /** 호출자가 제공한 오디오 컨텍스트를 빌려 사용한다. */
  readonly context: SpeechAudioContext
  /** 재생 중 입 모양을 전달하고 종료 시 null로 해제한다. */
  readonly onMouth: (pose: MouthPose | null) => void
  /** 취소 또는 세션 종료를 전달하는 신호다. */
  readonly signal: AbortSignal
  /** 음성 시계에 맞춰 샘플링할 입 모양 트랙이다. */
  readonly mouth: SpeechMouthTrack
}

export const playSpeechAudio = (options: PlaySpeechAudioOptions): Promise<void> => {
  options.signal.throwIfAborted()
  const {audio, context, signal} = options
  const source = context.createBufferSource()
  source.buffer = audio
  source.connect(context.destination)
  return new Promise((resolve, reject) => {
    let frame = 0
    const start = context.currentTime
    const clean = () => {
      options.frames.cancel(frame)
      source.onended = null
      signal.removeEventListener('abort', abort)
      source.disconnect()
      options.onMouth(null)
    }
    const abort = () => {
      clean()
      source.stop()
      reject(signal.reason ?? new DOMException('Cancelled', 'AbortError'))
    }
    const update = () => {
      options.onMouth(sampleMouthTrack(options.mouth, context.currentTime - start))
      frame = options.frames.request(update)
    }
    source.onended = () => {
      clean()
      resolve()
    }
    signal.addEventListener('abort', abort, {once: true})
    try {
      source.start(start)
      frame = options.frames.request(update)
    } catch (cause) {
      clean()
      reject(cause)
    }
  })
}
