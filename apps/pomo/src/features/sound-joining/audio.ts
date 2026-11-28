import {clampUnit} from 'src/utils/clamp-unit'
import {createStereoWave} from '../sound-generation/audio'
import {
  CONNECTION_CONTEXT_SECONDS,
  EDGE_RAMP_SECONDS,
  MAX_AI_CONNECTION_SECONDS,
  MIN_AI_CONNECTION_SECONDS,
  SAMPLE_RATE,
} from '../sound-generation/connection'

export interface StereoAudio {
  readonly left: Float32Array
  readonly right: Float32Array
}
export interface JoinParameters {
  readonly trimEnd: number
  readonly trimStart: number
  readonly connectionSeconds: number
}
export interface JoinOptions extends JoinParameters {
  readonly first: StereoAudio
  readonly second: StereoAudio
}
export interface JoinPlan extends StereoAudio {
  readonly offset: number
  readonly connectionSeconds: number
  readonly context: StereoAudio
}
const PCM_SCALE = 32767
const CONTEXT = CONNECTION_CONTEXT_SECONDS * SAMPLE_RATE

export function getJoinParameterError({
  trimEnd,
  trimStart,
  connectionSeconds,
}: JoinParameters): string | null {
  if (
    ![trimEnd, trimStart, connectionSeconds].every(Number.isFinite) ||
    trimEnd < 0 ||
    trimStart < 0 ||
    connectionSeconds < MIN_AI_CONNECTION_SECONDS ||
    connectionSeconds > MAX_AI_CONNECTION_SECONDS
  ) {
    return `잘라낼 시간은 0 이상, 연결 구간은 1~${MAX_AI_CONNECTION_SECONDS}초로 지정해 주세요.`
  }
  return null
}

export function prepareJoin(options: JoinOptions): JoinPlan {
  const {first, second, trimEnd, trimStart, connectionSeconds} = options
  const parameterError = getJoinParameterError(options)
  if (parameterError !== null) {
    throw new Error(parameterError)
  }
  const end = first.left.length - Math.round(trimEnd * SAMPLE_RATE)
  const start = Math.round(trimStart * SAMPLE_RATE)
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
    connectionSeconds,
    context: {
      left: left.slice(offset, end + CONTEXT),
      right: right.slice(offset, end + CONTEXT),
    },
    left,
    offset,
    right,
  }
}

export function assembleJoin(plan: JoinPlan, generated: StereoAudio): Blob {
  if (generated.left.length !== 2 * CONTEXT || generated.right.length !== 2 * CONTEXT) {
    throw new Error('생성된 연결음의 길이가 올바르지 않습니다.')
  }
  const start = Math.round((CONNECTION_CONTEXT_SECONDS - plan.connectionSeconds / 2) * SAMPLE_RATE)
  const end = Math.round((CONNECTION_CONTEXT_SECONDS + plan.connectionSeconds / 2) * SAMPLE_RATE)
  const blend = Math.round(EDGE_RAMP_SECONDS * SAMPLE_RATE)
  const patches = [generated.left, generated.right]
  // Reject invalid patches before allocating or scanning the full source PCM.
  for (const patch of patches) {
    for (let index = start; index < end; index += 1) {
      if (!Number.isFinite(patch[index])) {
        throw new Error('연결음에 유효하지 않은 샘플이 있습니다.')
      }
    }
  }
  const pcm = new Int32Array(plan.left.length * 2)
  for (let index = 0; index < plan.left.length; index += 1) {
    pcm[index * 2] = Math.round(plan.left[index] * PCM_SCALE)
    pcm[index * 2 + 1] = Math.round(plan.right[index] * PCM_SCALE)
  }
  const channels = [plan.left, plan.right]
  for (let channel = 0; channel < 2; channel += 1) {
    for (let index = start; index < end; index += 1) {
      const target = plan.offset + index
      if (Number.isInteger(target) && target >= 0 && target < channels[channel].length) {
        const weight = clampUnit(Math.min((index - start) / blend, (end - 1 - index) / blend), {
          fallback: 0,
        })
        // Preserve the Float32 store that preceded PCM quantization.
        const sample = Math.fround(
          channels[channel][target] * (1 - weight) + patches[channel][index] * weight,
        )
        pcm[target * 2 + channel] = Math.round(sample * PCM_SCALE)
      }
    }
  }
  return createStereoWave(pcm, plan.left.length)
}
