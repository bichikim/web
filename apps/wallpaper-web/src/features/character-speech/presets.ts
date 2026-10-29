import manifest from '../../data/speech-presets.json'
import {prepareSpeechLine} from './configuration'
import {MOUTH_DURATION_TOLERANCE, parseMouthTrack} from './mouth-track'
import type {PreparedSpeechPlayback} from './types'

export const speechPresets = manifest

interface LoadPresetSpeechOptions {
  /** 프리셋 음성과 입 모양을 요청하며 취소 신호를 전달한다. */
  readonly fetch: typeof fetch
  /** 호출자가 제공한 오디오 컨텍스트를 빌려 사용한다. */
  readonly context: Pick<AudioContext, 'decodeAudioData'>
  /** 음성 프로필까지 포함하여 계산한 캐시 키다. */
  readonly key: string
  /** 취소 또는 세션 종료를 전달하는 신호다. */
  readonly signal: AbortSignal
  /** 프리셋과 비교할 정규화된 대사다. */
  readonly text: string
}

export const loadPresetSpeech = async (
  options: LoadPresetSpeechOptions,
): Promise<PreparedSpeechPlayback | null> => {
  options.signal.throwIfAborted()
  const preset = speechPresets.find((entry) => prepareSpeechLine(entry.text) === options.text)
  if (preset === undefined) {
    return null
  }
  if (preset.cacheKey !== options.key) {
    throw new Error('Preset speech profile differs; regenerate preset assets')
  }
  const [audioResponse, mouthResponse] = await Promise.all([
    options.fetch(`${preset.audio}?v=${preset.cacheKey}`, {signal: options.signal}),
    options.fetch(`${preset.mouth}?v=${preset.cacheKey}`, {signal: options.signal}),
  ])
  if (!audioResponse.ok || !mouthResponse.ok) {
    throw new Error('Preset speech asset download failed')
  }
  const [compressed, source] = await Promise.all([
    audioResponse.arrayBuffer(),
    mouthResponse.json(),
  ])
  options.signal.throwIfAborted()
  const mouth = parseMouthTrack(source)
  if (mouth === null) {
    throw new Error('Preset speech mouth track is invalid')
  }
  const audio = await options.context.decodeAudioData(compressed)
  options.signal.throwIfAborted()
  if (Math.abs(audio.duration - mouth.duration) > MOUTH_DURATION_TOLERANCE) {
    throw new Error('Preset speech duration differs from mouth track')
  }
  return {audio, mouth}
}
