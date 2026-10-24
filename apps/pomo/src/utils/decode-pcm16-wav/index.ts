// oxlint-disable no-magic-numbers -- RIFF 청크 오프셋과 PCM16 배율은 형식에 정의된 상수다.
export interface DecodedPcm16Wave {
  /** 원본 WAV의 채널 수이다. */
  readonly channels: number
  /** 초당 프레임 수를 나타내는 원본 샘플 레이트이다. */
  readonly sampleRate: number
  /** 프레임마다 원본 채널 순서로 교차 배치한 부동소수점 샘플이다. */
  readonly samples: Float32Array
}
export interface WaveDecodeOptions {
  /** data 청크가 잘렸을 때의 정책이다. 생략하면 거부하며, read-available은 남아 있는 완전한 프레임만 읽는다. */
  readonly truncatedData?: 'reject' | 'read-available'
}
interface WaveChunk {
  readonly offset: number
  readonly size: number
}
const readText = (view: DataView, offset: number) =>
  String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset + offset, 4))

const readPcmChunks = (view: DataView, options: WaveDecodeOptions) => {
  let format: WaveChunk | null = null
  let data: WaveChunk | null = null
  let offset = 12
  while (offset + 8 <= view.byteLength) {
    const kind = readText(view, offset)
    const size = view.getUint32(offset + 4, true)
    const start = offset + 8
    if (
      start + size > view.byteLength &&
      !(kind === 'data' && options.truncatedData === 'read-available')
    ) {
      return null
    }
    if (kind === 'fmt ' && format === null) {
      format = {offset: start, size}
    }
    if (kind === 'data' && data === null) {
      data = {offset: start, size: Math.min(size, view.byteLength - start)}
    }
    offset = start + size + (size % 2)
  }
  return format === null || format.size < 16 || data === null || data.size < 2
    ? null
    : {data, format}
}

/** PCM16 WAV를 채널 수와 프레임 내 채널 순서를 유지한 부동소수점 샘플로 디코딩한다. 지원하지 않는 형식이나 잘못된 데이터에는 null을 반환한다. */
export const decodePcm16Wav = (
  bytes: ArrayBuffer | Uint8Array,
  options: WaveDecodeOptions = {},
): DecodedPcm16Wave | null => {
  const view =
    bytes instanceof Uint8Array
      ? new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      : new DataView(bytes)
  if (view.byteLength < 12 || readText(view, 0) !== 'RIFF' || readText(view, 8) !== 'WAVE') {
    return null
  }
  const chunks = readPcmChunks(view, options)
  if (chunks === null) {
    return null
  }
  const {data, format} = chunks
  const channels = view.getUint16(format.offset + 2, true)
  const sampleRate = view.getUint32(format.offset + 4, true)
  if (
    view.getUint16(format.offset, true) !== 1 ||
    channels < 1 ||
    sampleRate < 1 ||
    view.getUint16(format.offset + 14, true) !== 16
  ) {
    return null
  }
  const frameCount = Math.floor(data.size / (channels * 2))
  const samples = new Float32Array(frameCount * channels)
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = view.getInt16(data.offset + index * 2, true) / 32_768
  }
  return {channels, sampleRate, samples}
}
