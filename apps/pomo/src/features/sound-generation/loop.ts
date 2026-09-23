// oxlint-disable no-magic-numbers -- Canonical PCM WAV header fields and stereo sample layout.
import {isNonBlankString} from 'src/utils/is-non-blank-string'
import type {SoundProgress} from './assets'
import {
  CONNECTION_CONTEXT_SECONDS,
  CONNECTION_WINDOW_SECONDS,
  createPcmEdgeBlend,
  DEFAULT_CONNECTION_SECONDS,
  EDGE_RAMP_SECONDS,
  MAX_AI_CONNECTION_SECONDS,
  MIN_AI_CONNECTION_SECONDS,
  PCM16_SCALE,
  SAMPLE_RATE,
  STEREO_FRAME_BYTES,
  WAV_HEADER_BYTES,
} from './connection'
import {MAX_GENERATION_SECONDS} from './extension'

async function validateWave(source: Blob): Promise<void> {
  if (
    source.size < WAV_HEADER_BYTES ||
    source.size > WAV_HEADER_BYTES + MAX_GENERATION_SECONDS * SAMPLE_RATE * STEREO_FRAME_BYTES
  ) {
    throw new Error('지원하는 WAV 크기를 벗어났습니다.')
  }
  const buffer = await source.slice(0, WAV_HEADER_BYTES).arrayBuffer()
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
    view.getUint32(24, true) !== SAMPLE_RATE ||
    view.getUint32(28, true) !== SAMPLE_RATE * STEREO_FRAME_BYTES ||
    view.getUint16(32, true) !== STEREO_FRAME_BYTES ||
    view.getUint16(34, true) !== 16 ||
    view.getUint32(40, true) !== source.size - WAV_HEADER_BYTES ||
    (source.size - WAV_HEADER_BYTES) % STEREO_FRAME_BYTES !== 0
  ) {
    throw new Error('환경음 생성 모듈의 44.1kHz 스테레오 PCM16 WAV가 필요합니다.')
  }
}

async function readContext(source: Blob) {
  const bytes = CONNECTION_CONTEXT_SECONDS * SAMPLE_RATE * STEREO_FRAME_BYTES
  const [tail, head] = await Promise.all([
    source.slice(source.size - bytes).arrayBuffer(),
    source.slice(WAV_HEADER_BYTES, WAV_HEADER_BYTES + bytes).arrayBuffer(),
  ])
  const views = [new DataView(tail), new DataView(head)]
  const left = new Float32Array(CONNECTION_WINDOW_SECONDS * SAMPLE_RATE)
  const right = new Float32Array(CONNECTION_WINDOW_SECONDS * SAMPLE_RATE)
  for (let part = 0; part < views.length; part += 1) {
    for (let frame = 0; frame < CONNECTION_CONTEXT_SECONDS * SAMPLE_RATE; frame += 1) {
      const target = part * CONNECTION_CONTEXT_SECONDS * SAMPLE_RATE + frame
      left[target] = views[part].getInt16(frame * STEREO_FRAME_BYTES, true) / PCM16_SCALE
      right[target] = views[part].getInt16(frame * STEREO_FRAME_BYTES + 2, true) / PCM16_SCALE
    }
  }
  return {left, right}
}

/**
 * Creates a loop from a canonical generated WAV in a Worker, preserving its length.
 * Replaces a 1–10-second connection across the ends (default 4); terminate the Worker to cancel inference.
 */
export async function generateLoopSound(
  source: Blob,
  prompt: string,
  progress: SoundProgress,
  connectionSeconds = DEFAULT_CONNECTION_SECONDS,
): Promise<Blob> {
  if (
    !isNonBlankString(prompt) ||
    !Number.isFinite(connectionSeconds) ||
    connectionSeconds < MIN_AI_CONNECTION_SECONDS ||
    connectionSeconds > MAX_AI_CONNECTION_SECONDS
  ) {
    throw new Error('소리 설명과 1–10초 사이의 연결 구간을 지정해 주세요.')
  }
  await validateWave(source)
  if (
    source.size <
    WAV_HEADER_BYTES + CONNECTION_WINDOW_SECONDS * SAMPLE_RATE * STEREO_FRAME_BYTES
  ) {
    throw new Error('루프 연결에는 최소 12초의 음원이 필요합니다.')
  }
  progress('음원의 끝과 시작을 읽고 있어요…')
  const context = await readContext(source)
  const {generateSound} = await import('./runtime')
  const generated = await generateSound(prompt, CONNECTION_WINDOW_SECONDS, progress, {
    inpaint: {
      ...context,
      end: CONNECTION_CONTEXT_SECONDS + connectionSeconds / 2,
      start: CONNECTION_CONTEXT_SECONDS - connectionSeconds / 2,
    },
  })
  await validateWave(generated)
  if (
    generated.size !==
    WAV_HEADER_BYTES + CONNECTION_WINDOW_SECONDS * SAMPLE_RATE * STEREO_FRAME_BYTES
  ) {
    throw new Error('생성된 루프 연결음 길이가 올바르지 않습니다.')
  }
  const frames = Math.round((connectionSeconds / 2) * SAMPLE_RATE)
  const bytes = frames * STEREO_FRAME_BYTES
  const [head, tail, patchBuffer] = await Promise.all([
    source.slice(WAV_HEADER_BYTES, WAV_HEADER_BYTES + bytes).arrayBuffer(),
    source.slice(source.size - bytes).arrayBuffer(),
    generated.slice(WAV_HEADER_BYTES).arrayBuffer(),
  ])
  progress('원본 길이를 유지하며 루프 연결음을 합치고 있어요…')
  const rampFrames = Math.round(EDGE_RAMP_SECONDS * SAMPLE_RATE)
  return new Blob(
    [
      source.slice(0, WAV_HEADER_BYTES),
      createPcmEdgeBlend({
        direction: 'generated-to-original',
        generated: patchBuffer,
        generatedStartFrame: CONNECTION_CONTEXT_SECONDS * SAMPLE_RATE,
        original: head,
        rampFrames,
      }),
      source.slice(WAV_HEADER_BYTES + bytes, source.size - bytes),
      createPcmEdgeBlend({
        direction: 'original-to-generated',
        generated: patchBuffer,
        generatedStartFrame: CONNECTION_CONTEXT_SECONDS * SAMPLE_RATE - frames,
        original: tail,
        rampFrames,
      }),
    ],
    {type: 'audio/wav'},
  )
}
