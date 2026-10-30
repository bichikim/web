import {encodeBase64} from '../../encoding/encode-base64'
import {type DecodeWavError, readWavHeader} from '../../player/audio/decode-wav'

const DATA_URL = /^data:[^,]*;base64,(?<payload>.*)$/su

const MESSAGES: Readonly<Record<DecodeWavError, string>> = {
  'invalid-format': 'WAV 파일의 형식 정보가 잘못되었습니다.',
  'missing-data': 'WAV 파일에 소리 데이터가 없습니다.',
  'missing-format': 'WAV 파일에 형식 정보가 없습니다.',
  'not-wav': 'WAV 파일이 아닙니다.',
  'unsupported-encoding': 'PCM(8·16·24·32비트) 또는 32비트 부동소수점 WAV만 쓸 수 있습니다.',
}

export type MotionSoundFileResult =
  | {readonly duration: number; readonly ok: true; readonly src: string}
  | {readonly message: string; readonly ok: false}

const fromBase64 = (text: string) =>
  Uint8Array.from(atob(text), (character) => character.codePointAt(0)!)

/** Checks that a chosen file is a WAV the players can decode and embeds it as a data URL. */
export const readMotionSoundFile = async (file: Blob): Promise<MotionSoundFileResult> => {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const result = readWavHeader(bytes)
  return result.ok
    ? {
        duration: result.header.duration,
        ok: true,
        src: `data:audio/wav;base64,${encodeBase64(bytes)}`,
      }
    : {message: MESSAGES[result.error], ok: false}
}

/** Seconds of an embedded sound; `undefined` for paths or sounds that do not decode. */
export const getEmbeddedSoundDuration = (src: string): number | undefined => {
  const base64 = DATA_URL.exec(src)?.groups?.payload
  if (base64 === undefined) {
    return undefined
  }
  try {
    const result = readWavHeader(fromBase64(base64))
    return result.ok ? result.header.duration : undefined
  } catch {
    return undefined
  }
}
