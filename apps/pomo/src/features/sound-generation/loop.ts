// oxlint-disable no-magic-numbers -- Canonical PCM WAV header fields and stereo sample layout.
import {noneEmptyString} from 'src/utils/none-empty-string'
import type {SoundProgress} from './assets'
import {MAX_GENERATION_SECONDS} from './extension'

const RATE = 44100
const FRAME_BYTES = 4
const HEADER_BYTES = 44
const CONTEXT_SECONDS = 6
const WINDOW_SECONDS = CONTEXT_SECONDS * 2
const DEFAULT_TRANSITION = 4
const MAX_TRANSITION = 8
const BLEND_FRAMES = Math.round(0.2 * RATE)

async function validateWave(source: Blob): Promise<void> {
  if (
    source.size < HEADER_BYTES ||
    source.size > HEADER_BYTES + MAX_GENERATION_SECONDS * RATE * FRAME_BYTES
  ) {
    throw new Error('지원하는 WAV 크기를 벗어났습니다.')
  }
  const buffer = await source.slice(0, HEADER_BYTES).arrayBuffer()
  const view = new DataView(buffer)
  const text = (start: number, end: number) => new TextDecoder().decode(buffer.slice(start, end))
  if (
    text(0, 4) !== 'RIFF' ||
    text(8, 16) !== 'WAVEfmt ' ||
    text(36, 40) !== 'data' ||
    view.getUint32(4, true) !== source.size - 8 ||
    view.getUint32(16, true) !== 16 ||
    view.getUint16(20, true) !== 1 ||
    view.getUint16(22, true) !== 2 ||
    view.getUint32(24, true) !== RATE ||
    view.getUint32(28, true) !== RATE * FRAME_BYTES ||
    view.getUint16(32, true) !== FRAME_BYTES ||
    view.getUint16(34, true) !== 16 ||
    view.getUint32(40, true) !== source.size - HEADER_BYTES ||
    (source.size - HEADER_BYTES) % FRAME_BYTES !== 0
  ) {
    throw new Error('환경음 생성 모듈의 44.1kHz 스테레오 PCM16 WAV가 필요합니다.')
  }
}

async function readContext(source: Blob) {
  const bytes = CONTEXT_SECONDS * RATE * FRAME_BYTES
  const [tail, head] = await Promise.all([
    source.slice(source.size - bytes).arrayBuffer(),
    source.slice(HEADER_BYTES, HEADER_BYTES + bytes).arrayBuffer(),
  ])
  const views = [new DataView(tail), new DataView(head)]
  const left = new Float32Array(WINDOW_SECONDS * RATE)
  const right = new Float32Array(WINDOW_SECONDS * RATE)
  for (let part = 0; part < views.length; part += 1) {
    for (let frame = 0; frame < CONTEXT_SECONDS * RATE; frame += 1) {
      const target = part * CONTEXT_SECONDS * RATE + frame
      left[target] = views[part].getInt16(frame * FRAME_BYTES, true) / 32768
      right[target] = views[part].getInt16(frame * FRAME_BYTES + 2, true) / 32768
    }
  }
  return {left, right}
}

function blendEdge(
  original: ArrayBuffer,
  patch: DataView,
  patchStart: number,
  head: boolean,
): ArrayBuffer {
  const blended = original.slice(0)
  const result = new DataView(blended)
  const frames = blended.byteLength / FRAME_BYTES
  for (let frame = 0; frame < frames; frame += 1) {
    const weight = Math.min(1, (head ? frames - 1 - frame : frame) / BLEND_FRAMES)
    for (let channel = 0; channel < 2; channel += 1) {
      const offset = frame * FRAME_BYTES + channel * 2
      const generated = patch.getInt16((patchStart + frame) * FRAME_BYTES + channel * 2, true)
      result.setInt16(
        offset,
        Math.round(result.getInt16(offset, true) * (1 - weight) + generated * weight),
        true,
      )
    }
  }
  return blended
}

/**
 * Creates a loop from a canonical generated WAV in a Worker, preserving its length.
 * Replaces 1–8 seconds across the ends (default 4); terminate the Worker to cancel inference.
 */
export async function generateLoopSound(
  source: Blob,
  prompt: string,
  progress: SoundProgress,
  transitionSeconds = DEFAULT_TRANSITION,
): Promise<Blob> {
  if (
    !noneEmptyString(prompt) ||
    !Number.isFinite(transitionSeconds) ||
    transitionSeconds < 1 ||
    transitionSeconds > MAX_TRANSITION
  ) {
    throw new Error('소리 설명과 1–8초 사이의 연결 구간을 지정해 주세요.')
  }
  await validateWave(source)
  if (source.size < HEADER_BYTES + WINDOW_SECONDS * RATE * FRAME_BYTES) {
    throw new Error('루프 연결에는 최소 12초의 음원이 필요합니다.')
  }
  progress('음원의 끝과 시작을 읽고 있어요…')
  const context = await readContext(source)
  const {generateSound} = await import('./runtime')
  const generated = await generateSound(prompt, WINDOW_SECONDS, progress, {
    ...context,
    end: CONTEXT_SECONDS + transitionSeconds / 2,
    start: CONTEXT_SECONDS - transitionSeconds / 2,
  })
  await validateWave(generated)
  if (generated.size !== HEADER_BYTES + WINDOW_SECONDS * RATE * FRAME_BYTES) {
    throw new Error('생성된 루프 연결음 길이가 올바르지 않습니다.')
  }
  const frames = Math.round((transitionSeconds / 2) * RATE)
  const bytes = frames * FRAME_BYTES
  const [head, tail, patchBuffer] = await Promise.all([
    source.slice(HEADER_BYTES, HEADER_BYTES + bytes).arrayBuffer(),
    source.slice(source.size - bytes).arrayBuffer(),
    generated.slice(HEADER_BYTES).arrayBuffer(),
  ])
  const patch = new DataView(patchBuffer)
  progress('원본 길이를 유지하며 루프 연결음을 합치고 있어요…')
  return new Blob(
    [
      source.slice(0, HEADER_BYTES),
      blendEdge(head, patch, CONTEXT_SECONDS * RATE, true),
      source.slice(HEADER_BYTES + bytes, source.size - bytes),
      blendEdge(tail, patch, CONTEXT_SECONDS * RATE - frames, false),
    ],
    {type: 'audio/wav'},
  )
}
