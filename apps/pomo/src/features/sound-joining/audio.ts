import {createStereoWave} from '../sound-generation/audio'

export interface StereoAudio {
  readonly left: Float32Array
  readonly right: Float32Array
}
export interface JoinOptions {
  readonly first: StereoAudio
  readonly second: StereoAudio
  readonly trimEnd: number
  readonly trimStart: number
  readonly transition: number
}
export interface JoinPlan extends StereoAudio {
  readonly offset: number
  readonly transition: number
  readonly context: StereoAudio
}
const RATE = 44100
const CONTEXT_SECONDS = 6
const MAX_TRANSITION = 8
const BLEND_SECONDS = 0.2
const PCM_SCALE = 32767
const CONTEXT = CONTEXT_SECONDS * RATE

export function prepareJoin(options: JoinOptions): JoinPlan {
  const {first, second, trimEnd, trimStart, transition} = options
  if (
    ![trimEnd, trimStart, transition].every(Number.isFinite) ||
    trimEnd < 0 ||
    trimStart < 0 ||
    transition < 1 ||
    transition > MAX_TRANSITION
  ) {
    throw new Error('잘라낼 시간은 0 이상, 연결 구간은 1~8초로 지정해 주세요.')
  }
  const end = first.left.length - Math.round(trimEnd * RATE)
  const start = Math.round(trimStart * RATE)
  if (
    end < CONTEXT ||
    second.left.length - start < CONTEXT ||
    first.right.length !== first.left.length ||
    second.right.length !== second.left.length
  ) {
    throw new Error('잘라낸 뒤 각 파일에 최소 6초의 소리가 남아 있어야 합니다.')
  }
  const combine = (left: Float32Array, right: Float32Array) => {
    const output = new Float32Array(end + right.length - start)
    output.set(left.subarray(0, end))
    output.set(right.subarray(start), end)
    return output
  }
  const left = combine(first.left, second.left)
  const right = combine(first.right, second.right)
  const offset = end - CONTEXT
  return {
    context: {
      left: left.slice(offset, end + CONTEXT),
      right: right.slice(offset, end + CONTEXT),
    },
    left,
    offset,
    right,
    transition,
  }
}

export function assembleJoin(plan: JoinPlan, generated: StereoAudio): Blob {
  if (generated.left.length !== 2 * CONTEXT || generated.right.length !== 2 * CONTEXT) {
    throw new Error('생성된 연결음의 길이가 올바르지 않습니다.')
  }
  const start = Math.round((CONTEXT_SECONDS - plan.transition / 2) * RATE)
  const end = Math.round((CONTEXT_SECONDS + plan.transition / 2) * RATE)
  const blend = Math.round(BLEND_SECONDS * RATE)
  const channels = [plan.left.slice(), plan.right.slice()]
  const patches = [generated.left, generated.right]
  for (let channel = 0; channel < 2; channel += 1) {
    for (let index = start; index < end; index += 1) {
      const weight = Math.min(1, (index - start) / blend, (end - 1 - index) / blend)
      const target = plan.offset + index
      const sample = patches[channel][index]
      if (!Number.isFinite(sample)) {
        throw new Error('연결음에 유효하지 않은 샘플이 있습니다.')
      }
      channels[channel][target] = channels[channel][target] * (1 - weight) + sample * weight
    }
  }
  const pcm = new Int32Array(plan.left.length * 2)
  for (let index = 0; index < plan.left.length; index += 1) {
    pcm[index * 2] = Math.round(channels[0][index] * PCM_SCALE)
    pcm[index * 2 + 1] = Math.round(channels[1][index] * PCM_SCALE)
  }
  return createStereoWave(pcm, plan.left.length)
}
