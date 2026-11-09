import {expect, test} from 'vitest'
import {convertCubismMotion} from '../convert-cubism-motion'
import {getTrackFadeWeight} from '../../player/playback/motion-fade'

test('should preserve all Cubism segment types, track fades and motion events', () => {
  const motion = convertCubismMotion(
    {
      Curves: [
        {
          FadeInTime: 0.2,
          Id: 'ParamAngleX',
          Segments: [0, 0, 0, 1, 10, 1, 1.2, 12, 1.8, 18, 2, 20, 2, 3, 30, 3, 4, 40],
          Target: 'Parameter',
        },
      ],
      Meta: {Duration: 4, Fps: 30, Loop: false},
      UserData: [{Time: 2, Value: 'marker'}],
      Version: 3,
    },
    {fadeInTime: 0.5, fadeOutTime: 0.8, group: 'Idle', id: 'motion'},
  )
  expect(motion).toMatchObject({
    duration: 4,
    events: [{time: 2, value: 'marker'}],
    fadeInTime: 0.5,
    fadeOutTime: 0.8,
    group: 'Idle',
    loop: false,
  })
  expect(motion.tracks[0]).toMatchObject({
    fadeInTime: 0.2,
    kind: 'parameter',
    parameterId: 'ParamAngleX',
  })
  expect(motion.tracks[0]!.keyframes.map((key) => key.easing)).toEqual([
    'linear',
    'bezier',
    'stepped',
    'inverse-stepped',
    undefined,
  ])
  const handles = motion.tracks[0]!.keyframes[1]!.bezier!
  expect(handles[0]).toBeCloseTo(0.2)
  expect(handles.slice(1, 3)).toEqual([12, 0.8])
  expect(handles[3]).toBe(18)
})

test('should translate model and group-opacity curves and reject truncated segments', () => {
  const source = {
    Curves: [
      {Id: 'EyeBlink', Segments: [0, 1, 0, 1, 0], Target: 'Model'},
      {Id: 'PartArmA', Segments: [0, 1, 0, 1, 0], Target: 'PartOpacity'},
    ],
    Meta: {Duration: 1},
    Version: 3,
  }
  expect(convertCubismMotion(source, {id: 'motion'}).tracks).toMatchObject([
    {kind: 'model', target: 'eye-blink'},
    {fadeInTime: 0, fadeOutTime: 0, kind: 'parameter', parameterId: 'PartArmA'},
  ])
  expect(() =>
    convertCubismMotion(
      {...source, Curves: [{Id: 'x', Segments: [0, 0, 1, 0.2], Target: 'Parameter'}]},
      {id: 'bad'},
    ),
  ).toThrow()
})

test('should use SDK motion defaults for negative global fades and retain curve inheritance', () => {
  const motion = convertCubismMotion(
    {
      Curves: [
        {FadeInTime: -1, FadeOutTime: -1, Id: 'p', Segments: [0, 0, 0, 1, 1], Target: 'Parameter'},
      ],
      Meta: {Duration: 1, FadeInTime: -1, FadeOutTime: -1},
      Version: 3,
    },
    {id: 'negative-fade'},
  )
  expect(motion.fadeInTime).toBe(1)
  expect(motion.fadeOutTime).toBe(1)
  expect(motion.tracks[0]?.fadeInTime).toBeUndefined()
  expect(motion.tracks[0]?.fadeOutTime).toBeUndefined()
})

test.each([-1, 0, 0.5])('should apply model3 fade override %s with SDK inheritance', (override) => {
  const motion = convertCubismMotion(
    {
      Curves: [],
      Meta: {Duration: 1, FadeInTime: 0.25, FadeOutTime: 0.75},
      Version: 3,
    },
    {fadeInTime: override, fadeOutTime: override, id: 'override'},
  )
  expect(motion.fadeInTime).toBe(override < 0 ? 0.25 : override)
  expect(motion.fadeOutTime).toBe(override < 0 ? 0.75 : override)
})

test('should inherit Meta fades in playback while preserving per-curve overrides', () => {
  const motion = convertCubismMotion(
    {
      Curves: [
        {Id: 'angle', Segments: [0, 0, 0, 2, 1], Target: 'Parameter'},
        {
          FadeInTime: 0,
          FadeOutTime: 0.5,
          Id: 'eye',
          Segments: [0, 0, 0, 2, 1],
          Target: 'Parameter',
        },
      ],
      Meta: {Duration: 2, FadeInTime: 0.5, FadeOutTime: 1},
      Version: 3,
    },
    {id: 'meta-fade'},
  )
  const frame = {
    blend: 'replace' as const,
    elapsed: 0.25,
    motion,
    priority: 0,
    time: 0.25,
    weight: 1,
  }
  expect(motion).toMatchObject({fadeInTime: 0.5, fadeOutTime: 1})
  expect(motion.tracks[0]?.fadeInTime).toBeUndefined()
  expect(motion.tracks[0]?.fadeOutTime).toBeUndefined()
  expect(getTrackFadeWeight(frame, motion.tracks[0]!)).toBeCloseTo(0.5, 12)
  expect(
    getTrackFadeWeight({...frame, elapsed: undefined, remaining: 0.5}, motion.tracks[0]!),
  ).toBeCloseTo(0.5, 12)
  expect(motion.tracks[1]).toMatchObject({fadeInTime: 0, fadeOutTime: 0.5})
  expect(getTrackFadeWeight(frame, motion.tracks[1]!)).toBe(1)
  expect(getTrackFadeWeight({...frame, remaining: 0.25}, motion.tracks[1]!)).toBeCloseTo(0.5, 12)
})

test.each([
  [undefined, 1],
  [-1, 1],
  [-0.125, 1],
  [0, 0],
  [0.25, 0.25],
])('should resolve Meta fade %s to %s seconds', (value, expected) => {
  const motion = convertCubismMotion(
    {
      Curves: [],
      Meta: {Duration: 1, FadeInTime: value, FadeOutTime: value},
      Version: 3,
    },
    {id: 'global-fade'},
  )
  expect(motion.fadeInTime).toBe(expected)
  expect(motion.fadeOutTime).toBe(expected)
})

test.each(
  ['FadeInTime', 'FadeOutTime'].flatMap((field) =>
    [NaN, Infinity, -Infinity, '0.5', null, false].map((value) => ({field, value})),
  ),
)('should reject invalid Meta $field=$value', ({field, value}) => {
  expect(() =>
    convertCubismMotion(
      {Curves: [], Meta: {Duration: 1, [field]: value}, Version: 3},
      {id: 'invalid-fade'},
    ),
  ).toThrow('Cubism JSON number is missing or invalid')
})
