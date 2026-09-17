// oxlint-disable no-magic-numbers -- PCM WAV header offsets and stereo sample layout.
// oxlint-disable no-await-in-loop -- Each extension consumes the previous generated tail.
import {isNonBlankString} from 'src/utils/is-non-blank-string'
import type {SoundProgress} from './assets'
import {
  createPcmCrossfade,
  DEFAULT_CONNECTION_SECONDS,
  MAX_GENERATION_CONNECTION_SECONDS,
  MIN_CONNECTION_SECONDS,
  PCM16_SCALE,
  SAMPLE_RATE,
  STEREO_FRAME_BYTES,
  WAV_HEADER_BYTES,
} from './connection'
import type {InpaintAudio} from './inpaint'
import {
  type ChunkNoiseMode,
  createNoiseSeed,
  createSeededNoiseSource,
  DEFAULT_CHUNK_NOISE_MODE,
  type NoiseSource,
} from './noise'

// Bounds output duration and PCM output below the 32-bit RIFF size limit.
export const MAX_GENERATION_SECONDS = 21600
const CHUNK_SECONDS = 120
const MAX_CHUNKS = 512
let running = false

export interface GenerateExtendedSoundOptions {
  readonly chunkNoiseMode?: ChunkNoiseMode
  readonly connectionSeconds?: number
}

export function canCreateGenerationPlan(seconds: number, connectionSeconds: number): boolean {
  try {
    createGenerationPlan(seconds, connectionSeconds)
    return true
  } catch {
    return false
  }
}

/** Returns bounded inference durations, including the requested connection duration after the first chunk. */
export function createGenerationPlan(
  seconds: number,
  connectionSeconds = DEFAULT_CONNECTION_SECONDS,
): number[] {
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > MAX_GENERATION_SECONDS) {
    throw new Error('생성 길이는 1–21,600초 사이의 정수로 입력해 주세요.')
  }
  if (
    !Number.isInteger(connectionSeconds) ||
    connectionSeconds < MIN_CONNECTION_SECONDS ||
    connectionSeconds > MAX_GENERATION_CONNECTION_SECONDS
  ) {
    throw new Error(
      `연결 구간은 0–${MAX_GENERATION_CONNECTION_SECONDS}초 사이의 정수로 입력해 주세요.`,
    )
  }
  // Each later chunk uses one connection window as model context and one as the PCM crossfade.
  const addedCapacity = CHUNK_SECONDS - connectionSeconds * 2
  const chunks = 1 + Math.ceil(Math.max(0, seconds - CHUNK_SECONDS) / addedCapacity)
  if (chunks > MAX_CHUNKS) {
    throw new Error('생성 횟수가 512회를 초과합니다. 연결 구간이나 총 길이를 줄여 주세요.')
  }
  const plan = [Math.min(seconds, CHUNK_SECONDS)]
  let remaining = seconds - plan[0]
  while (remaining > 0) {
    const added = Math.min(remaining, addedCapacity)
    plan.push(added + connectionSeconds * 2)
    remaining -= added
  }
  return plan
}

async function createContext(
  previous: Blob,
  seconds: number,
  connectionSeconds: number,
): Promise<InpaintAudio> {
  const frames = connectionSeconds * SAMPLE_RATE
  const tail = new DataView(
    await previous.slice(previous.size - frames * STEREO_FRAME_BYTES).arrayBuffer(),
  )
  const left = new Float32Array(seconds * SAMPLE_RATE)
  const right = new Float32Array(seconds * SAMPLE_RATE)
  for (let frame = 0; frame < frames; frame += 1) {
    left[frame] = tail.getInt16(frame * STEREO_FRAME_BYTES, true) / PCM16_SCALE
    right[frame] = tail.getInt16(frame * STEREO_FRAME_BYTES + 2, true) / PCM16_SCALE
  }
  return {end: seconds, left, right, start: connectionSeconds}
}

function takeTail(parts: Blob[], bytes: number): Blob {
  let remaining = bytes
  const tail: Blob[] = []
  for (let index = parts.length - 1; index >= 0 && remaining > 0; index -= 1) {
    const part = parts[index]
    const start = Math.max(0, part.size - remaining)
    tail.unshift(part.slice(start))
    remaining -= part.size - start
  }
  if (remaining > 0) {
    throw new Error('연결 구간을 만들 만큼 생성된 오디오가 충분하지 않습니다.')
  }
  return new Blob(tail, {type: 'audio/wav'})
}

function createChunkNoiseSourceFactory(mode: ChunkNoiseMode, seed: number): () => NoiseSource {
  switch (mode) {
    case 'continuous': {
      const source = createSeededNoiseSource(seed)
      return () => source
    }
    case 'repeat':
      return () => createSeededNoiseSource(seed)
    default: {
      const unsupportedMode: never = mode
      throw new Error(`청크 노이즈 방식이 올바르지 않습니다: ${String(unsupportedMode)}`)
    }
  }
}

function removeTail(parts: Blob[], bytes: number): void {
  let remaining = bytes
  while (remaining > 0 && parts.length > 0) {
    const lastIndex = parts.length - 1
    const part = parts[lastIndex]
    if (part.size <= remaining) {
      parts.pop()
      remaining -= part.size
    } else {
      parts[lastIndex] = part.slice(0, part.size - remaining)
      remaining = 0
    }
  }
  if (remaining > 0) {
    throw new Error('연결 구간을 만들 만큼 생성된 오디오가 충분하지 않습니다.')
  }
}

async function appendConnectedChunk(
  parts: Blob[],
  chunk: Blob,
  connectionSeconds: number,
): Promise<void> {
  if (parts.length === 0 || connectionSeconds === MIN_CONNECTION_SECONDS) {
    parts.push(chunk.slice(WAV_HEADER_BYTES))
    return
  }

  const connectionFrames = connectionSeconds * SAMPLE_RATE
  const connectionBytes = connectionFrames * STEREO_FRAME_BYTES
  const previousTail = takeTail(parts, connectionBytes)
  const generatedHead = chunk.slice(
    WAV_HEADER_BYTES + connectionBytes,
    WAV_HEADER_BYTES + connectionBytes * 2,
  )
  const [previousBuffer, generatedBuffer] = await Promise.all([
    previousTail.arrayBuffer(),
    generatedHead.arrayBuffer(),
  ])
  const mixed = createPcmCrossfade({next: generatedBuffer, previous: previousBuffer})
  removeTail(parts, connectionBytes)
  parts.push(
    new Blob([mixed], {type: 'audio/wav'}),
    chunk.slice(WAV_HEADER_BYTES + connectionBytes * 2),
  )
}

/** Generates 1–21,600 seconds sequentially in a Worker; terminate the Worker to cancel active inference. */
export async function generateExtendedSound(
  prompt: string,
  seconds: number,
  progress: SoundProgress,
  options: GenerateExtendedSoundOptions = {},
): Promise<Blob> {
  const connectionSeconds = options.connectionSeconds ?? DEFAULT_CONNECTION_SECONDS
  const chunkNoiseMode = options.chunkNoiseMode ?? DEFAULT_CHUNK_NOISE_MODE
  const plan = createGenerationPlan(seconds, connectionSeconds)
  if (!isNonBlankString(prompt)) {
    throw new Error('소리 설명을 입력해 주세요.')
  }
  const nextNoiseSource = createChunkNoiseSourceFactory(chunkNoiseMode, createNoiseSeed())
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
    for (const [index, duration] of plan.entries()) {
      const context =
        previous === undefined || connectionSeconds === MIN_CONNECTION_SECONDS
          ? undefined
          : await createContext(previous, duration, connectionSeconds)
      const prefix = `${index + 1}/${plan.length} 구간 · ${completed}/${seconds}초`
      const chunk = await generateSound(
        prompt,
        duration,
        (message) => progress(`${prefix} · ${message}`),
        {inpaint: context, noiseSource: nextNoiseSource()},
      )
      if (chunk.size !== WAV_HEADER_BYTES + duration * SAMPLE_RATE * STEREO_FRAME_BYTES) {
        throw new Error('생성된 WAV 길이가 요청과 다릅니다.')
      }
      if (header === undefined) {
        header = await chunk.slice(0, WAV_HEADER_BYTES).arrayBuffer()
      }
      await appendConnectedChunk(parts, chunk, connectionSeconds)
      completed += previous === undefined ? duration : duration - connectionSeconds * 2
      previous = chunk
    }
    if (header === undefined) {
      throw new Error('생성된 오디오가 없습니다.')
    }
    const view = new DataView(header)
    const bytes = seconds * SAMPLE_RATE * STEREO_FRAME_BYTES
    view.setUint32(4, bytes + WAV_HEADER_BYTES - 8, true)
    view.setUint32(40, bytes, true)
    progress(`${seconds}초 WAV를 준비하고 있어요…`)
    return new Blob([header, ...parts], {type: 'audio/wav'})
  } finally {
    running = false
  }
}
