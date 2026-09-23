export const DEFAULT_OVERLAP_SECONDS = 4
const MAX_OVERLAP_RATIO = 0.5

export interface CrossfadeOptions {
  readonly buffer: AudioBuffer
  readonly overlapSeconds?: number
}

/** 원본 시작을 보존하고 끝부분에 시작 구간을 겹쳐 섞은 새 버퍼를 만든다. */
export const createCrossfadeBuffer = (options: CrossfadeOptions): AudioBuffer => {
  const source = options.buffer
  const overlap = options.overlapSeconds ?? DEFAULT_OVERLAP_SECONDS
  if (!Number.isFinite(overlap) || overlap <= 0 || overlap > source.duration * MAX_OVERLAP_RATIO) {
    throw new Error(
      `연결 시간은 0초보다 크고 음원 길이의 절반(${(source.duration * MAX_OVERLAP_RATIO).toFixed(2)}초)까지 설정하세요.`,
    )
  }
  const frames = Math.round(overlap * source.sampleRate)
  if (frames < 1 || frames >= source.length) {
    throw new Error('연결 구간은 최소 한 샘플 이상이며 원본보다 짧아야 합니다.')
  }
  const result = new AudioBuffer({
    length: source.length,
    numberOfChannels: source.numberOfChannels,
    sampleRate: source.sampleRate,
  })
  for (let channel = 0; channel < source.numberOfChannels; channel += 1) {
    const original = source.getChannelData(channel)
    const output = result.getChannelData(channel)
    output.set(original)
    for (let frame = 0; frame < frames; frame += 1) {
      const mix = frames === 1 ? 1 : frame / (frames - 1)
      const target = source.length - frames + frame
      output[target] = original[target] * (1 - mix) + original[frame] * mix
    }
  }
  return result
}

export interface LoopPositionOptions {
  readonly position: number
  readonly duration: number
  readonly loopStart: number
}

/** 첫 재생 이후 겹친 시작 구간을 제외한 반복 영역의 위치를 구한다. */
export const resolveLoopPosition = (options: LoopPositionOptions): number => {
  if (options.position < options.duration) {
    return options.position
  }
  return (
    options.loopStart +
    ((options.position - options.duration) % (options.duration - options.loopStart))
  )
}
