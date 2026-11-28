import {expect, it, vi} from 'vitest'
import {clampUnit} from 'src/utils/clamp-unit'
import {createStereoWave} from 'src/features/sound-generation/audio'
import {
  CONNECTION_CONTEXT_SECONDS,
  EDGE_RAMP_SECONDS,
  MAX_AI_CONNECTION_SECONDS,
  MIN_AI_CONNECTION_SECONDS,
} from 'src/features/sound-generation/connection'
import {
  assembleJoin,
  getJoinParameterError,
  type JoinPlan,
  prepareJoin,
  type StereoAudio,
} from '../audio'
const RATE = 44100
const source = (value: number) => ({
  left: new Float32Array(10 * RATE).fill(value),
  right: new Float32Array(10 * RATE).fill(-value),
})

it('should accept zero trims and inclusive connection duration bounds', () => {
  const parameters = {connectionSeconds: 4, trimEnd: 0, trimStart: 0}

  expect(
    getJoinParameterError({...parameters, connectionSeconds: MIN_AI_CONNECTION_SECONDS}),
  ).toBeNull()
  expect(
    getJoinParameterError({...parameters, connectionSeconds: MAX_AI_CONNECTION_SECONDS}),
  ).toBeNull()
  expect(prepareJoin({...parameters, first: source(0.1), second: source(0.2)}).left.length).toBe(
    20 * RATE,
  )
})

it.each([
  {name: 'non-finite first trim', parameters: {trimEnd: Number.NaN}},
  {name: 'non-finite second trim', parameters: {trimStart: Number.POSITIVE_INFINITY}},
  {name: 'negative first trim', parameters: {trimEnd: -0.1}},
  {name: 'negative second trim', parameters: {trimStart: -0.1}},
  {
    name: 'short connection duration',
    parameters: {connectionSeconds: MIN_AI_CONNECTION_SECONDS - 0.1},
  },
  {
    name: 'long connection duration',
    parameters: {connectionSeconds: MAX_AI_CONNECTION_SECONDS + 0.1},
  },
])('should return an error for a $name', ({parameters}) => {
  expect(
    getJoinParameterError({connectionSeconds: 4, trimEnd: 0, trimStart: 0, ...parameters}),
  ).not.toBeNull()
})
it('should trim both sources and preserve samples outside the replacement region', async () => {
  const plan = prepareJoin({
    connectionSeconds: 4,
    first: source(0.1),
    second: source(0.2),
    trimEnd: 2,
    trimStart: 2,
  })
  expect(plan.left.length).toBe(16 * RATE)
  expect(plan.offset).toBe(2 * RATE)
  const patch = {
    left: new Float32Array(12 * RATE).fill(0.3),
    right: new Float32Array(12 * RATE).fill(-0.3),
  }
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = reject
    reader.readAsArrayBuffer(assembleJoin(plan, patch))
  })
  const data = new DataView(buffer)
  const sample = (second: number, channel: number) =>
    data.getInt16(44 + (second * RATE * 2 + channel) * 2, true)
  expect(sample(1, 0)).toBe(Math.round(0.1 * 32767))
  expect(sample(14, 0)).toBe(Math.round(0.2 * 32767))
  expect(sample(8, 0)).toBe(Math.round(0.3 * 32767))
  expect(sample(8, 1)).toBe(-Math.round(0.3 * 32767))
})
it('should reject cuts leaving insufficient context and invalid connection durations', () => {
  const options = {
    connectionSeconds: 4,
    first: source(0.1),
    second: source(0.2),
    trimEnd: 2,
    trimStart: 2,
  }
  expect(() => prepareJoin({...options, trimEnd: 5})).toThrow('최소 6초')
  expect(() => prepareJoin({...options, trimStart: 5})).toThrow('최소 6초')
  expect(() => prepareJoin({...options, connectionSeconds: Number.NaN})).toThrow('1~10초')
})

const CONTEXT = CONNECTION_CONTEXT_SECONDS * RATE
const START = Math.round((CONNECTION_CONTEXT_SECONDS - 0.5) * RATE)
const END = Math.round((CONNECTION_CONTEXT_SECONDS + 0.5) * RATE)
const BLEND = Math.round(EDGE_RAMP_SECONDS * RATE)
const LENGTH_ERROR = '생성된 연결음의 길이가 올바르지 않습니다.'
const SAMPLE_ERROR = '연결음에 유효하지 않은 샘플이 있습니다.'

// Freeze the pre-refactor Float32 storage semantics from dev 699e9b7a; use the real WAV encoder.
function referenceAssembly(plan: JoinPlan, generated: StereoAudio): Blob {
  if (generated.left.length !== 2 * CONTEXT || generated.right.length !== 2 * CONTEXT) {
    throw new Error(LENGTH_ERROR)
  }
  const start = Math.round((CONNECTION_CONTEXT_SECONDS - plan.connectionSeconds / 2) * RATE)
  const end = Math.round((CONNECTION_CONTEXT_SECONDS + plan.connectionSeconds / 2) * RATE)
  const channels = [plan.left.slice(), plan.right.slice()]
  const patches = [generated.left, generated.right]
  for (let channel = 0; channel < 2; channel += 1) {
    for (let index = start; index < end; index += 1) {
      const weight = clampUnit(Math.min((index - start) / BLEND, (end - 1 - index) / BLEND), {
        fallback: 0,
      })
      const target = plan.offset + index
      const sample = patches[channel][index]
      if (!Number.isFinite(sample)) {
        throw new Error(SAMPLE_ERROR)
      }
      channels[channel][target] = channels[channel][target] * (1 - weight) + sample * weight
    }
  }
  const pcm = new Int32Array(plan.left.length * 2)
  for (let index = 0; index < plan.left.length; index += 1) {
    pcm[index * 2] = Math.round(channels[0][index] * 32767)
    pcm[index * 2 + 1] = Math.round(channels[1][index] * 32767)
  }
  return createStereoWave(pcm, plan.left.length)
}

function createPatch(): StereoAudio {
  return {
    left: new Float32Array(2 * CONTEXT).fill(0.23012422025203705),
    right: new Float32Array(2 * CONTEXT).fill(-0.65),
  }
}

function createPlan(left: Float32Array, right: Float32Array, offset: number): JoinPlan {
  return {
    connectionSeconds: 1,
    context: {left: new Float32Array(), right: new Float32Array()},
    left,
    offset,
    right,
  }
}

function readWave(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = reject
    reader.readAsArrayBuffer(blob)
  })
}

function channelWords(channel: Float32Array): Uint32Array {
  return new Uint32Array(channel.buffer, channel.byteOffset, channel.length)
}

async function expectAssembly(plan: JoinPlan, generated: StereoAudio): Promise<DataView> {
  const inputs = [plan.left, plan.right, generated.left, generated.right]
  const snapshots = inputs.map((channel) => channelWords(channel).slice())
  const expected = await readWave(referenceAssembly(plan, generated))
  const wave = assembleJoin(plan, generated)
  const actual = await readWave(wave)
  // The header and stereo frames are four-byte aligned; compare every bit in native words.
  const words = new Uint32Array(actual)
  const expectedWords = new Uint32Array(expected)
  expect(wave.type).toBe('audio/wav')
  expect(words.length).toBe(expectedWords.length)
  expect(words.findIndex((word, index) => word !== expectedWords[index])).toBe(-1)
  for (const [index, channel] of inputs.entries()) {
    expect(
      channelWords(channel).findIndex((word, offset) => word !== snapshots[index][offset]),
    ).toBe(-1)
  }
  return new DataView(actual)
}

function expectRejection(plan: JoinPlan, generated: StereoAudio, message: string): void {
  const inputs = [plan.left, plan.right, generated.left, generated.right]
  const snapshots = inputs.map((channel) => channelWords(channel).slice())
  expect(() => referenceAssembly(plan, generated)).toThrowError(new Error(message))
  expect(() => assembleJoin(plan, generated)).toThrowError(new Error(message))
  for (const [index, channel] of inputs.entries()) {
    expect(
      channelWords(channel).findIndex((word, offset) => word !== snapshots[index][offset]),
    ).toBe(-1)
  }
}

it.each([START, START + BLEND / 2, END - 1 - BLEND / 2, END - 1])(
  'should preserve stereo WAV bytes at ramp frame %s without mutating inputs',
  async (frame) => {
    const plan = createPlan(
      new Float32Array([0.39669543504714966, -0.2, 0.7]),
      new Float32Array([-0.15, 0.8, -0.4]),
      -frame,
    )
    const generated = createPatch()
    const data = await expectAssembly(plan, generated)
    expect(data.getUint16(22, true)).toBe(2)
    expect(data.getUint32(24, true)).toBe(RATE)
    expect(data.getUint32(40, true)).toBe(12)
    if (frame === START + BLEND / 2) {
      expect(data.getInt16(44, true)).toBe(10270)
      expect(Math.round((plan.left[0] * 0.5 + generated.left[frame] * 0.5) * 32767)).toBe(10269)
    }
  },
)

it.each([1, 4.5, 10])(
  'should preserve every prepared and trimmed WAV byte for a %s second connection',
  async (connectionSeconds) => {
    const plan = prepareJoin({
      connectionSeconds,
      first: source(0.1),
      second: source(0.2),
      trimEnd: 2,
      trimStart: 2,
    })
    const data = await expectAssembly(plan, createPatch())
    expect(plan.left.length).toBe(16 * RATE)
    expect(plan.offset).toBe(2 * RATE)
    expect(data.byteLength).toBe(44 + plan.left.length * 4)
  },
)

it.each([
  {left: 0, name: 'empty stereo', right: 0},
  {left: 0, name: 'empty left and longer right', right: 8},
  {left: 8, name: 'shorter right', right: 2},
  {left: 2, name: 'longer right', right: 8},
])('should preserve WAV length and zero fill for $name channels', async ({left, right}) => {
  const data = await expectAssembly(
    createPlan(new Float32Array(left).fill(0.25), new Float32Array(right).fill(-0.5), -START),
    createPatch(),
  )
  expect(data.byteLength).toBe(44 + left * 4)
  for (let frame = right; frame < left; frame += 1) {
    expect(data.getInt16(44 + frame * 4 + 2, true)).toBe(0)
  }
})

it.each([-START - 20, 20, -START + 0.5, Number.NaN, Number.POSITIVE_INFINITY])(
  'should preserve ignored writes for an out-of-range or fractional offset %s',
  async (offset) => {
    await expectAssembly(
      createPlan(new Float32Array([0.2, 0.4]), new Float32Array([-0.3]), offset),
      createPatch(),
    )
  },
)

it.each([-START, -START - BLEND, Number.POSITIVE_INFINITY])(
  'should preserve public PCM conversion for non-finite sources, signed zero and clipping at %s',
  async (offset) => {
    const samples = new Float32Array([
      -0,
      0,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      1.5,
      -1.5,
      2 ** 20,
      -(2 ** 20),
    ])
    const data = await expectAssembly(createPlan(samples, samples.slice(), offset), createPatch())
    for (const frame of [2, 3, 4]) {
      expect(data.getInt16(44 + frame * 4, true)).toBe(0)
      expect(data.getInt16(46 + frame * 4, true)).toBe(0)
    }
    if (offset === Number.POSITIVE_INFINITY) {
      expect(
        Array.from({length: samples.length}, (_, frame) => data.getInt16(44 + frame * 4, true)),
      ).toEqual([0, 0, 0, 0, 0, 32767, -32768, -32768, 32767])
    }
  },
)

it.each([
  {channel: 'left' as const, length: 2 * CONTEXT - 1},
  {channel: 'left' as const, length: 2 * CONTEXT + 1},
  {channel: 'right' as const, length: 2 * CONTEXT - 1},
  {channel: 'right' as const, length: 2 * CONTEXT + 1},
])(
  'should reject $channel generated length $length before sample validation',
  ({channel, length}) => {
    const generated = createPatch()
    generated.left[START] = Number.NaN
    expectRejection(
      createPlan(new Float32Array([0.2]), new Float32Array([0.4]), -START),
      {...generated, [channel]: new Float32Array(length)},
      LENGTH_ERROR,
    )
  },
)

it.each([
  {channel: 'left' as const, frame: START, value: Number.NaN},
  {channel: 'left' as const, frame: START + 1, value: Number.POSITIVE_INFINITY},
  {channel: 'right' as const, frame: END - 1, value: Number.NEGATIVE_INFINITY},
])(
  'should reject an invalid $channel sample at $frame including zero-weight edges',
  ({channel, frame, value}) => {
    const generated = createPatch()
    generated[channel][frame] = value
    expectRejection(
      createPlan(new Float32Array([0.2]), new Float32Array([0.4]), -START),
      generated,
      SAMPLE_ERROR,
    )
  },
)

it.each([-START + 0.5, Number.POSITIVE_INFINITY])(
  'should still validate generated samples when output is empty or offset %s cannot be written',
  (offset) => {
    const generated = createPatch()
    generated.right[END - 1] = Number.NaN
    expectRejection(
      createPlan(new Float32Array(), new Float32Array(), offset),
      generated,
      SAMPLE_ERROR,
    )
  },
)

it('should ignore invalid generated samples outside the selected patch window', async () => {
  const generated = createPatch()
  generated.left[START - 1] = Number.NaN
  generated.right[END] = Number.POSITIVE_INFINITY
  await expectAssembly(
    createPlan(new Float32Array([0.1, -0.2]), new Float32Array([0.3, 0.4]), -START),
    generated,
  )
})

it('should reject the last selected right sample before allocating interleaved PCM', () => {
  const generated = createPatch()
  generated.right[END - 1] = Number.NaN
  const plan = createPlan(new Float32Array(8), new Float32Array(8), -START)
  const allocate = vi.spyOn(globalThis, 'Int32Array')
  try {
    expect(() => assembleJoin(plan, generated)).toThrowError(new Error(SAMPLE_ERROR))
    expect(allocate).not.toHaveBeenCalled()
  } finally {
    allocate.mockRestore()
  }
})
