import {describe, expect, test} from 'vitest'
import {mixMotionFrames, mixMotionVertices} from '../mix-motion-frames'
import type {MotionFrame} from '../types'
import {createEmptyDocument} from '../../create-empty-document'

const document = {
  ...createEmptyDocument(),
  parameters: [
    {defaultValue: 10, id: 'angle', maximum: 100, minimum: -100, name: 'Angle'},
    {defaultValue: 0, id: 'mouth', maximum: 1, minimum: 0, name: 'Mouth'},
  ],
}

test('should select motion precision independently of the history base', () => {
  const value = 10 - 1e-8
  const options = {baseParameterValues: {angle: value}, frames: []}
  expect(
    mixMotionFrames({
      ...options,
      document: {
        ...document,
        motionParameterBase: 'previous-frame',
        motionParameterPrecision: 'float64',
      },
    }).motionParameterValues.angle,
  ).toBe(value)
  expect(
    mixMotionFrames({
      ...options,
      document: {...document, motionParameterPrecision: 'float32'},
    }).motionParameterValues.angle,
  ).toBe(10)
})

test('should retain SDK motion history at Float32 precision at discrete key boundaries', () => {
  const value = 10 - 1e-8
  const native = mixMotionFrames({baseParameterValues: {angle: value}, document, frames: []})
  const sdk = mixMotionFrames({
    baseParameterValues: {angle: value},
    document: {...document, motionParameterBase: 'previous-frame'},
    frames: [],
  })
  expect(native.parameterValues.angle).toBe(value)
  expect(sdk.parameterValues.angle).toBe(10)
  expect(sdk.motionParameterValues.angle).toBe(10)
})
const frame = (value: number, options: Partial<MotionFrame> = {}): MotionFrame => ({
  blend: 'replace',
  motion: {
    duration: 1,
    id: 'motion',
    tracks: [{keyframes: [{time: 0, value}], kind: 'parameter', parameterId: 'angle'}],
  },
  priority: 0,
  time: 0,
  weight: 1,
  ...options,
})

describe('mixMotionFrames', () => {
  test('should apply expressions over motions and under external overrides', () => {
    const expressions = [
      {
        expression: {
          id: 'look',
          parameters: [
            {blend: 'add' as const, parameterId: 'angle', value: 5},
            {blend: 'overwrite' as const, parameterId: 'mouth', value: 1},
          ],
        },
        weight: 1,
      },
    ]
    const mixed = mixMotionFrames({document, expressions, frames: [frame(30)]}).parameterValues
    expect(mixed).toEqual({angle: 35, mouth: 1})
    const overridden = mixMotionFrames({
      document,
      expressions,
      frames: [frame(30)],
      parameterValues: {angle: -20},
    }).parameterValues
    expect(overridden.angle).toBe(-20)
  })

  test('should normalize large finite weights without overflowing their sum', () => {
    const frames = [frame(30, {weight: 1e308}), frame(70, {weight: 1e308})]
    expect(mixMotionFrames({document, frames}).parameterValues.angle).toBeCloseTo(50)
  })
  test('should blend equal priorities independently of start order', () => {
    const frames = [frame(30, {weight: 0.25}), frame(70, {weight: 0.75})]
    expect(mixMotionFrames({document, frames}).parameterValues.angle).toBe(60)
    expect(mixMotionFrames({document, frames: frames.toReversed()}).parameterValues.angle).toBe(60)
  })
  test('should retain the lower layer when the higher layer has partial weight', () => {
    expect(
      mixMotionFrames({document, frames: [frame(30), frame(70, {priority: 1, weight: 0.5})]})
        .parameterValues.angle,
    ).toBe(50)
  })
  test('should add changes relative to the default and apply external overrides last', () => {
    const frames = [frame(30), frame(20, {blend: 'add', priority: 1, weight: 0.5})]
    expect(mixMotionFrames({document, frames}).parameterValues.angle).toBe(35)
    expect(
      mixMotionFrames({document, frames, parameterValues: {angle: 80}}).parameterValues.angle,
    ).toBe(80)
  })
  test('should keep unrelated targets and ignore empty tracks and zero weight', () => {
    const mouth = frame(0, {
      motion: {
        duration: 1,
        id: 'mouth',
        tracks: [
          {keyframes: [{time: 0, value: 0.8}], kind: 'parameter', parameterId: 'mouth'},
          {keyframes: [], kind: 'parameter', parameterId: 'angle'},
        ],
      },
    })
    expect(
      mixMotionFrames({document, frames: [frame(30), mouth, frame(90, {weight: 0})]})
        .parameterValues,
    ).toEqual({angle: 30, mouth: 0.8})
  })
  test('should resolve bounds and discrete options after mixing', () => {
    const discrete = {
      ...document,
      parameters: [
        {
          ...document.parameters[0]!,
          options: [
            {label: 'Low', value: 0},
            {label: 'High', value: 100},
          ],
        },
      ],
    }
    expect(
      mixMotionFrames({document: discrete, frames: [frame(0), frame(100)]}).parameterValues.angle,
    ).toBe(0)
    expect(mixMotionFrames({document, frames: [frame(200)]}).parameterValues.angle).toBe(100)
  })
  test('should normalize replacement weights above one without amplifying them', () => {
    const frames = [frame(30, {weight: 2}), frame(60, {weight: 1})]
    expect(mixMotionFrames({document, frames}).parameterValues.angle).toBeCloseTo(40)
  })
  test('should distinguish inherited object properties from direct parameter overrides', () => {
    const inherited = {...document, parameters: [{...document.parameters[0]!, id: 'constructor'}]}
    const motion = {
      duration: 1,
      id: 'motion',
      tracks: [
        {keyframes: [{time: 0, value: 30}], kind: 'parameter' as const, parameterId: 'constructor'},
      ],
    }
    expect(
      mixMotionFrames({document: inherited, frames: [frame(0, {motion})], parameterValues: {}})
        .parameterValues.constructor,
    ).toBe(30)
  })
})

describe('mixMotionVertices', () => {
  test('should mix overlapping coordinates and preserve untracked deformed coordinates', () => {
    const motion = {
      duration: 1,
      id: 'vertex',
      tracks: [
        {
          axis: 'x' as const,
          keyframes: [{time: 0, value: 50}],
          kind: 'vertex' as const,
          partId: 'part',
          vertexIndex: 0,
        },
      ],
    }
    const frames = [
      frame(0, {motion, weight: 0.5}),
      frame(0, {blend: 'add', motion, priority: 1, weight: 0.5}),
    ]
    const mixed = mixMotionFrames({document, frames})
    expect(
      mixMotionVertices({
        partId: 'part',
        restVertices: [10, 20],
        samples: mixed.vertexSamples,
        vertices: [30, 40],
      }),
    ).toEqual([60, 40])
  })
})

test('should blend imported fades from previous motion values without retaining expressions or overrides', () => {
  const motion = {...frame(30).motion, fadeInTime: 0.5}
  const first = mixMotionFrames({
    document,
    frames: [frame(10, {elapsed: 0.25, motion})],
    parameterValues: {angle: 90},
  })
  expect(first.motionParameterValues.angle).toBeCloseTo(20)
  expect(first.parameterValues.angle).toBe(90)
  const second = mixMotionFrames({
    baseParameterValues: first.motionParameterValues,
    document,
    frames: [frame(10, {elapsed: 0.25, motion})],
  })
  expect(second.motionParameterValues.angle).toBeCloseTo(25)
})
