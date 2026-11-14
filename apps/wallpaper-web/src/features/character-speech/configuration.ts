import pronunciations from '../../data/speech-pronunciations.json'
import {getSupertonicAssetUrl, getSupertonicModel} from '@winter-love/supertonic/model'
import {normalizeSpeechText} from '@winter-love/supertonic/number-speech'

export const SPEECH_MODEL = getSupertonicModel('int8')
export const SPEECH_VOICE_PATH = 'voice-styles/sora.json'
export const SPEECH_BITRATE = 96
export const MOUTH_TRACK_STEP = 0.02
const SHORT_LENGTH = 10
const SHORT_SPEED = 0.8
const DEFAULT_SPEED = 1.05
const MAXIMUM_LENGTH = 150
const HEX_RADIX = 16

export const prepareSpeechLine = (text: string) => {
  const trimmed = text.trim()
  const reading = pronunciations.find((entry) => entry.text === trimmed)?.reading ?? trimmed
  return normalizeSpeechText({language: 'ko', maximumLength: MAXIMUM_LENGTH, text: reading})
}
export const getSpeechSpeed = (text: string) =>
  pronunciations.find((entry) => entry.reading === text)?.speed ??
  (text.length <= SHORT_LENGTH ? SHORT_SPEED : DEFAULT_SPEED)

export const getSpeechCacheKey = async (text: string, subtle: Pick<SubtleCrypto, 'digest'>) => {
  const identity = JSON.stringify({
    bitrate: SPEECH_BITRATE,
    language: 'ko',
    model: SPEECH_MODEL.baseUrl,
    mouthStep: MOUTH_TRACK_STEP,
    revision: 1,
    speed: getSpeechSpeed(text),
    text,
    voice: getSupertonicAssetUrl(SPEECH_VOICE_PATH),
  })
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(identity))
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(HEX_RADIX).padStart(2, '0'),
  ).join('')
}
