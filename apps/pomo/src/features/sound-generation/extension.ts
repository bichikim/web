// oxlint-disable no-magic-numbers -- PCM WAV header offsets and stereo sample layout.
// oxlint-disable no-await-in-loop -- Each extension consumes the previous generated tail.
import type {SoundProgress} from './assets'
import type {InpaintAudio} from './inpaint'

// Bounds output duration and PCM output below the 32-bit RIFF size limit.
export const MAX_GENERATION_SECONDS = 21600
const CHUNK_SECONDS = 120
const DEFAULT_OVERLAP_SECONDS = 4
const MAX_CHUNKS = 512
const RATE = 44100
const FRAME_BYTES = 4
const HEADER_BYTES = 44
const PCM_SCALE = 32768
let running = false

/** Returns bounded inference durations, including the requested overlap after the first chunk. */
export function createGenerationPlan(
  seconds: number,
  overlapSeconds = DEFAULT_OVERLAP_SECONDS,
): number[] {
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > MAX_GENERATION_SECONDS) {
    throw new Error('생성 길이는 1–21,600초 사이의 정수로 입력해 주세요.')
  }
  if (!Number.isInteger(overlapSeconds) || overlapSeconds < 1 || overlapSeconds >= CHUNK_SECONDS) {
    throw new Error('겹치는 길이는 1–119초 사이의 정수로 입력해 주세요.')
  }
  const chunks =
    1 + Math.ceil(Math.max(0, seconds - CHUNK_SECONDS) / (CHUNK_SECONDS - overlapSeconds))
  if (chunks > MAX_CHUNKS) {
    throw new Error('생성 횟수가 512회를 초과합니다. 겹치는 길이나 총 길이를 줄여 주세요.')
  }
  const plan = [Math.min(seconds, CHUNK_SECONDS)]
  let remaining = seconds - plan[0]
  while (remaining > 0) {
    const added = Math.min(remaining, CHUNK_SECONDS - overlapSeconds)
    plan.push(added + overlapSeconds)
    remaining -= added
  }
  return plan
}

async function createContext(
  previous: Blob,
  seconds: number,
  overlapSeconds: number,
): Promise<InpaintAudio> {
  const frames = overlapSeconds * RATE
  const tail = new DataView(
    await previous.slice(previous.size - frames * FRAME_BYTES).arrayBuffer(),
  )
  const left = new Float32Array(seconds * RATE)
  const right = new Float32Array(seconds * RATE)
  for (let frame = 0; frame < frames; frame += 1) {
    left[frame] = tail.getInt16(frame * FRAME_BYTES, true) / PCM_SCALE
    right[frame] = tail.getInt16(frame * FRAME_BYTES + 2, true) / PCM_SCALE
  }
  return {end: seconds, left, right, start: overlapSeconds}
}

/** Generates 1–21,600 seconds sequentially in a Worker; terminate the Worker to cancel active inference. */
export async function generateExtendedSound(
  prompt: string,
  seconds: number,
  progress: SoundProgress,
  overlapSeconds = DEFAULT_OVERLAP_SECONDS,
): Promise<Blob> {
  const plan = createGenerationPlan(seconds, overlapSeconds)
  if (!prompt.trim()) {
    throw new Error('소리 설명을 입력해 주세요.')
  }
  if (running) {
    throw new Error('이미 환경음을 생성하고 있습니다.')
  }
  running = true
  try {
    const {generateSound} = await import('./runtime')
    const parts: Blob[] = []
    let previous: Blob | undefined
    let header: ArrayBuffer | undefined
    let completed = 0
    for (const duration of plan) {
      const context =
        previous === undefined ? undefined : await createContext(previous, duration, overlapSeconds)
      const prefix = `${parts.length + 1}/${plan.length} 구간 · ${completed}/${seconds}초`
      const chunk = await generateSound(
        prompt,
        duration,
        (message) => progress(`${prefix} · ${message}`),
        context,
      )
      if (chunk.size !== HEADER_BYTES + duration * RATE * FRAME_BYTES) {
        throw new Error('생성된 WAV 길이가 요청과 다릅니다.')
      }
      if (header === undefined) {
        header = await chunk.slice(0, HEADER_BYTES).arrayBuffer()
      }
      const skip = previous === undefined ? 0 : overlapSeconds
      parts.push(chunk.slice(HEADER_BYTES + skip * RATE * FRAME_BYTES))
      completed += duration - skip
      previous = chunk
    }
    if (header === undefined) {
      throw new Error('생성된 오디오가 없습니다.')
    }
    const view = new DataView(header)
    const bytes = seconds * RATE * FRAME_BYTES
    view.setUint32(4, bytes + HEADER_BYTES - 8, true)
    view.setUint32(40, bytes, true)
    progress(`${seconds}초 WAV를 준비하고 있어요…`)
    return new Blob([header, ...parts], {type: 'audio/wav'})
  } finally {
    running = false
  }
}
