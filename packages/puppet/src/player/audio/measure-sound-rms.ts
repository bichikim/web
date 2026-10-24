import type {PuppetSound} from './decode-wav'

/** 끝나는 프레임의 남은 샘플까지 포함한 채널별 RMS. 구간이 음원 뒤에 있으면 생략한다. */
export const measureSoundRms = (
  sound: PuppetSound,
  time: number,
  duration: number,
): number | undefined => {
  const end = Math.floor(time * sound.sampleRate)
  const start = Math.max(0, Math.floor((time - duration) * sound.sampleRate))
  const limit = Math.min(end, sound.mono.length)
  if (start >= sound.mono.length || time < 0) {
    return undefined
  }
  let power = 0
  for (const channel of sound.channels) {
    for (let index = start; index < limit; index += 1) {
      power += channel[index]! ** 2
    }
  }
  return limit <= start ? 0 : Math.sqrt(power / (sound.channels.length * (limit - start)))
}
