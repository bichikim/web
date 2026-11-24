import {expect, test} from 'vitest'
import {createTrackingParameters, resolveTrackingParameter} from '../parameters'

test('should map independent head, eye and body directions to their own parameters', () => {
  const map = createTrackingParameters(
    [
      {defaultValue: 0, id: 'ParamAngleX', maximum: 30, minimum: -30},
      {defaultValue: 0, id: 'ParamEyeBallX', maximum: 1, minimum: -1},
      {defaultValue: 0, id: 'ParamBodyAngleX', maximum: 10, minimum: -10},
    ],
    {bodyX: {parameterId: 'ParamBodyAngleX'}},
    {bodyScale: 1},
    'cursor',
  )
  expect(map({x: 0.25, y: 0}, {x: 0, y: 0}, {x: 0.5, y: 0}, {x: 0.75, y: 0})).toEqual({
    ParamAngleX: 7.5,
    ParamBodyAngleX: 5,
    ParamEyeBallX: 0.75,
  })
})

test('should tune body rotation without changing head movement or exceeding the body rig', () => {
  const parameters = [
    {defaultValue: 0, id: 'ParamAngleX', maximum: 30, minimum: -30},
    {defaultValue: 0, id: 'ParamBodyAngleX', maximum: 10, minimum: -10},
  ]
  const bindings = {bodyX: {parameterId: 'ParamBodyAngleX'}}
  const map = (bodyScale: number) =>
    createTrackingParameters(parameters, bindings, {bodyScale}, 'cursor')
  expect(map(0)({x: 1, y: 0})).toEqual({ParamAngleX: 30, ParamBodyAngleX: 0})
  expect(map(0.6)({x: 1, y: 0})).toEqual({ParamAngleX: 30, ParamBodyAngleX: 6})
  expect(map(1)({x: -1, y: 0})).toEqual({ParamAngleX: -30, ParamBodyAngleX: -10})
})

test('should follow horizontal gaze with a smaller, independently smoothed body turn only when connected', () => {
  const parameters = [
    {defaultValue: 0, id: 'ParamAngleX', maximum: 30, minimum: -30},
    {defaultValue: 0, id: 'ParamBodyAngleX', maximum: 10, minimum: -10},
  ]
  const point = {x: 1, y: 0}
  expect(createTrackingParameters(parameters, {}, {}, 'cursor')(point)).toEqual({ParamAngleX: 30})
  const bindings = {bodyX: {blend: 'add' as const, parameterId: 'ParamBodyAngleX'}}
  const map = createTrackingParameters(parameters, bindings, {bodyScale: 0.3}, 'cursor')
  expect(map(point)).toEqual({ParamAngleX: 30, ParamBodyAngleX: 3})
  expect(map(point, {x: 0, y: 0}, {x: 0.25, y: 0})).toEqual({
    ParamAngleX: 30,
    ParamBodyAngleX: 0.75,
  })
  expect(map({x: -1, y: 0})).toEqual({ParamAngleX: -30, ParamBodyAngleX: -3})
  expect(
    createTrackingParameters(parameters, {bodyX: {parameterId: null}}, {}, 'cursor')(point),
  ).not.toHaveProperty('ParamBodyAngleX')
  const reversed = createTrackingParameters(
    parameters,
    {
      bodyX: {inverted: true, parameterId: 'ParamBodyAngleX'},
    },
    {bodyScale: 0.3},
    'cursor',
  )
  expect(reversed(point).ParamBodyAngleX).toBe(-3)
})

test('should scale the cursor curve to each configured endpoint and respect the model range', () => {
  const parameters = [
    {defaultValue: 0, id: 'face-x', maximum: 30, minimum: -30},
    {defaultValue: 0, id: 'face-y', maximum: 30, minimum: -30},
    {defaultValue: 0, id: 'gaze-x', maximum: 1, minimum: -1},
    {defaultValue: 0, id: 'gaze-y', maximum: 1, minimum: -1},
  ]
  const cursor = createTrackingParameters(
    parameters,
    {},
    {
      eyeMaximumX: 0.5,
      eyeMaximumY: 0.4,
      eyeMinimumX: -0.25,
      eyeMinimumY: -0.2,
      headMaximumX: 20,
      headMaximumY: 12,
      headMinimumX: -10,
      headMinimumY: -8,
    },
    'cursor',
  )
  expect(cursor({x: 0.5, y: 0.5})).toEqual({
    'face-x': 10,
    'face-y': 6,
    'gaze-x': 0.25,
    'gaze-y': 0.2,
  })
  expect(cursor({x: -0.5, y: -0.5})).toEqual({
    'face-x': -5,
    'face-y': -4,
    'gaze-x': -0.125,
    'gaze-y': -0.1,
  })
  expect(cursor({x: 1, y: 1})).toEqual({'face-x': 20, 'face-y': 12, 'gaze-x': 0.5, 'gaze-y': 0.4})
  expect(cursor({x: -1, y: -1})).toEqual({
    'face-x': -10,
    'face-y': -8,
    'gaze-x': -0.25,
    'gaze-y': -0.2,
  })
  const oversized = createTrackingParameters(
    parameters,
    {},
    {eyeMaximumX: 10, headMaximumX: 180},
    'cursor',
  )
  expect(oversized({x: 1, y: 0})).toMatchObject({'face-x': 30, 'gaze-x': 1})
})

test('should use the full cursor range at default gains without changing camera calibration', () => {
  const parameters = [
    {defaultValue: 0, id: 'face-x', maximum: 30, minimum: -30},
    {defaultValue: 0, id: 'face-y', maximum: 30, minimum: -30},
    {defaultValue: 0, id: 'gaze-x', maximum: 1, minimum: -1},
    {defaultValue: 0, id: 'gaze-y', maximum: 1, minimum: -1},
  ]
  const cursor = createTrackingParameters(parameters, {}, {}, 'cursor')
  const result = cursor({x: 1 / 3, y: 1 / 3})
  expect(result['face-x']).toBeCloseTo(10)
  expect(result['face-y']).toBeCloseTo(10)
  expect(result['gaze-x']).toBeCloseTo(1 / 3)
  expect(result['gaze-y']).toBeCloseTo(1 / 3)
  const limited = createTrackingParameters(
    parameters,
    {headX: {inverted: true}},
    {eyeResponseX: 0, headLimitX: 7},
    'cursor',
  )
  expect(limited({x: 1, y: 0})).toMatchObject({'face-x': -7, 'gaze-x': 0})
  expect(createTrackingParameters(parameters)({x: 1, y: 0})['face-x']).toBe(12)
})

test('should adjust intermediate cursor response while retaining the configured endpoint at any positive gain', () => {
  const parameters = [{defaultValue: 0, id: 'face-x', maximum: 30, minimum: -30}]
  const slower = createTrackingParameters(parameters, {}, {headResponseX: 0.5}, 'cursor')
  const faster = createTrackingParameters(parameters, {}, {headResponseX: 2}, 'cursor')
  expect(slower({x: 0.5, y: 0})['face-x']).toBe(10)
  expect(faster({x: 0.5, y: 0})['face-x']).toBe(20)
  expect(slower({x: 1, y: 0})['face-x']).toBe(30)
  expect(slower({x: -1, y: 0})['face-x']).toBe(-30)
  const disabled = createTrackingParameters(parameters, {}, {headResponseX: 0}, 'cursor')
  expect(disabled({x: 1, y: 0})['face-x']).toBe(0)
})

test('should tune horizontal and vertical response independently while retaining the camera viewing direction', () => {
  const parameters = [
    {defaultValue: 0, id: 'face-x', maximum: 30, minimum: -30},
    {defaultValue: 0, id: 'face-y', maximum: 30, minimum: -30},
  ]
  const map = createTrackingParameters(
    parameters,
    {},
    {
      headResponseX: 0,
      headResponseY: 2,
      headScale: 1.5,
      headVerticalScale: 3,
    },
  )
  expect(map({x: 1, y: 0.2})).toEqual({'face-x': 0, 'face-y': 3.2})
  const fixed = createTrackingParameters(
    parameters,
    {},
    {headResponseX: 3, headResponseY: 0, headScale: 1.5},
  )
  const origin = {x: 0.2, y: 0.3}
  expect(fixed(origin, origin)['face-y']).toBeCloseTo(3.6)
  expect(fixed({x: 0.2, y: 1}, origin)['face-y']).toBeCloseTo(3.6)
})

test('should require a choice for ambiguous identifiers and never infer unrelated names', () => {
  const parameters = ['face-x', 'ParamAngleX', 'custom-turn'].map((id) => ({
    defaultValue: 0,
    id,
    maximum: 30,
    minimum: -30,
  }))
  expect(resolveTrackingParameter(parameters, 'headX')).toBeUndefined()
  expect(resolveTrackingParameter(parameters, 'headY')).toBeUndefined()
  expect(resolveTrackingParameter(parameters, 'headX', 'custom-turn')?.id).toBe('custom-turn')
  expect(
    createTrackingParameters(parameters, {headX: {inverted: true, parameterId: 'custom-turn'}})({
      x: 1,
      y: 0,
    }),
  ).toEqual({'custom-turn': -12})
  expect(createTrackingParameters(parameters, {headX: {parameterId: null}})({x: 1, y: 0})).toEqual(
    {},
  )
})

test('should limit head rotation and eye movement without driving unrelated parameters', () => {
  const map = createTrackingParameters([
    {defaultValue: 0, id: 'face-x', maximum: 30, minimum: -30},
    {defaultValue: 0, id: 'face-y', maximum: 30, minimum: -30},
    {defaultValue: 0, id: 'gaze-x', maximum: 1, minimum: -1},
    {defaultValue: 0, id: 'gaze-y', maximum: 1, minimum: -1},
    {defaultValue: 0, id: 'mouth-open', maximum: 1, minimum: 0},
  ])
  expect(map({x: 100, y: -100})).toEqual({
    'face-x': 12,
    'face-y': -20,
    'gaze-x': 0.6,
    'gaze-y': -1,
  })
  expect(map({x: 0, y: 0})).toEqual({'face-x': 0, 'face-y': 0, 'gaze-x': 0, 'gaze-y': 0})
})

test('should support Cubism and sample identifiers and respect asymmetric parameter ranges', () => {
  const map = createTrackingParameters([
    {defaultValue: 2, id: 'ParamAngleX', maximum: 6, minimum: -2},
    {defaultValue: 0, id: 'angle-y', maximum: 30, minimum: -30},
    {defaultValue: 0, id: 'ParamEyeBallX', maximum: 1, minimum: -1},
  ])
  expect(map({x: 1, y: 1})).toEqual({'angle-y': 20, ParamAngleX: 3.6, ParamEyeBallX: 0.6})
  expect(createTrackingParameters([])({x: 1, y: 1})).toEqual({})
})

test('should scale head and eyes independently without exceeding model ranges', () => {
  const parameters = [
    {defaultValue: 0, id: 'face-x', maximum: 30, minimum: -30},
    {defaultValue: 0, id: 'gaze-x', maximum: 1, minimum: -1},
  ]
  expect(
    createTrackingParameters(parameters, {}, {eyeScale: 2, headScale: 0.5})({x: 1, y: 0}),
  ).toEqual({'face-x': 6, 'gaze-x': 1})
  expect(
    createTrackingParameters(parameters, {}, {eyeScale: 0, headScale: 3})({x: -1, y: 0}),
  ).toEqual({'face-x': -30, 'gaze-x': 0})
})

test('should cap each axis after applying input and gain', () => {
  const map = createTrackingParameters(
    [
      {defaultValue: 0, id: 'face-x', maximum: 30, minimum: -30},
      {defaultValue: 0, id: 'face-y', maximum: 30, minimum: -30},
      {defaultValue: 0, id: 'gaze-x', maximum: 1, minimum: -1},
      {defaultValue: 0, id: 'gaze-y', maximum: 1, minimum: -1},
    ],
    {},
    {eyeLimitX: 0.2, eyeLimitY: 0, eyeScale: 3, headLimitX: 10, headLimitY: 4, headScale: 2},
  )
  expect(map({x: 0.5, y: -1})).toEqual({'face-x': 10, 'face-y': -4, 'gaze-x': 0.2, 'gaze-y': 0})
})

test('should strengthen vertical head response independently while retaining configured and model limits', () => {
  const parameters = [
    {defaultValue: 0, id: 'face-x', maximum: 30, minimum: -30},
    {defaultValue: 0, id: 'face-y', maximum: 30, minimum: -30},
    {defaultValue: 0, id: 'gaze-y', maximum: 1, minimum: -1},
  ]
  const point = {x: 0.5, y: 0.5}
  expect(createTrackingParameters(parameters, {}, {headScale: 1.5})(point)).toEqual({
    'face-x': 9,
    'face-y': 15,
    'gaze-y': 0.75,
  })
  expect(
    createTrackingParameters(parameters, {}, {headScale: 1.5, headVerticalScale: 1})(point),
  ).toEqual({
    'face-x': 9,
    'face-y': 6,
    'gaze-y': 0.75,
  })
  expect(
    createTrackingParameters(parameters, {}, {headScale: 3, headVerticalScale: 5})({x: 0, y: 1})[
      'face-y'
    ],
  ).toBe(30)
  expect(
    createTrackingParameters(
      parameters,
      {},
      {headLimitY: 7, headScale: 3, headVerticalScale: 5},
    )({x: 0, y: -1})['face-y'],
  ).toBe(-7)
})

test('should tune vertical gaze independently and apply gain before user and model limits', () => {
  const parameters = [
    {defaultValue: 0, id: 'face-y', maximum: 30, minimum: -30},
    {defaultValue: 0, id: 'gaze-x', maximum: 1, minimum: -1},
    {defaultValue: 0, id: 'gaze-y', maximum: 1, minimum: -1},
  ]
  const point = {x: 0.5, y: 0.5}
  expect(createTrackingParameters(parameters, {}, {})(point)).toEqual({
    'face-y': 10,
    'gaze-x': 0.3,
    'gaze-y': 0.75,
  })
  expect(createTrackingParameters(parameters, {}, {eyeVerticalScale: 1})(point)).toEqual({
    'face-y': 10,
    'gaze-x': 0.3,
    'gaze-y': 0.3,
  })
  expect(createTrackingParameters(parameters, {}, {eyeVerticalScale: 0})(point)['gaze-y']).toBe(0)
  expect(
    createTrackingParameters(parameters, {}, {eyeScale: 3, eyeVerticalScale: 5})({x: 0, y: 1})[
      'gaze-y'
    ],
  ).toBe(1)
  expect(
    createTrackingParameters(
      parameters,
      {},
      {eyeLimitY: 0.2, eyeScale: 3, eyeVerticalScale: 5},
    )({x: 0, y: -1})['gaze-y'],
  ).toBe(-0.2)
})

test('should follow upward with a downward-positive eye rig and honor an explicit direction', () => {
  const parameters = [
    {defaultValue: 0, id: 'gaze-y', maximum: 1, minimum: -1, positiveY: 'down' as const},
  ]
  expect(createTrackingParameters(parameters)({x: 0, y: 0.5})['gaze-y']).toBe(-0.75)
  expect(
    createTrackingParameters(parameters, {eyeY: {inverted: false}})({x: 0, y: 0.5})['gaze-y'],
  ).toBe(0.75)
})

test('should amplify camera movement around its fixed viewing direction without saturating at rest', () => {
  const parameters = [{defaultValue: 0, id: 'gaze-y', maximum: 1, minimum: -1}]
  const map = createTrackingParameters(parameters, {}, {eyeVerticalScale: 3.6})
  const origin = {x: 0, y: 0.6}
  expect(map(origin, origin)['gaze-y']).toBeCloseTo(0.36)
  expect(map({x: 0, y: 0.8}, origin)['gaze-y']).toBeCloseTo(0.792)
  expect(map({x: 0, y: 0.4}, origin)['gaze-y']).toBeCloseTo(-0.072)
  expect(map({x: 0, y: 1}, origin)['gaze-y']).toBe(1)
  expect(
    createTrackingParameters(parameters, {}, {eyeVerticalScale: 0})(origin, origin)['gaze-y'],
  ).toBe(0)
})

test('should offset each gaze and head center independently before applying movement limits', () => {
  const parameters = [
    {defaultValue: 0, id: 'face-x', maximum: 30, minimum: -30},
    {defaultValue: 0, id: 'face-y', maximum: 30, minimum: -30},
    {defaultValue: 0, id: 'gaze-x', maximum: 1, minimum: -1},
    {defaultValue: 0, id: 'gaze-y', maximum: 1, minimum: -1, positiveY: 'down' as const},
  ]
  const map = createTrackingParameters(
    parameters,
    {},
    {
      eyeCenterX: -0.2,
      eyeCenterY: 0.3,
      eyeLimitX: 0.1,
      eyeLimitY: 0.1,
      headCenterX: 4,
      headCenterY: -3,
      headLimitX: 2,
      headLimitY: 2,
    },
  )
  expect(map({x: 0, y: 0})).toEqual({'face-x': 4, 'face-y': -3, 'gaze-x': -0.2, 'gaze-y': -0.3})
  expect(map({x: 1, y: 1})).toEqual({'face-x': 6, 'face-y': -1, 'gaze-x': -0.1, 'gaze-y': -0.4})
  expect(
    createTrackingParameters(parameters, {}, {headCenterX: 5, headScale: 0})({x: 1, y: 1})[
      'face-x'
    ],
  ).toBe(5)
})

test('should clamp centers and their motion to the model range and honor explicit inversion', () => {
  const parameters = [{defaultValue: 2, id: 'custom', maximum: 6, minimum: -2}]
  const bindings = {headX: {inverted: true, parameterId: 'custom'}}
  const map = createTrackingParameters(parameters, bindings, {headCenterX: -3, headLimitX: 2})
  expect(map({x: 0, y: 0}).custom).toBe(5)
  expect(map({x: -1, y: 0}).custom).toBe(5.4)
  expect(map({x: 1, y: 0}).custom).toBe(3)
  expect(
    createTrackingParameters(parameters, bindings, {headCenterX: -100})({x: 0, y: 0}).custom,
  ).toBe(6)
})

test('should clamp to independent directional bounds while preserving the configured base and inversion', () => {
  const parameters = [
    {defaultValue: 0, id: 'face-x', maximum: 100, minimum: -100},
    {defaultValue: 0, id: 'gaze-y', maximum: 10, minimum: -10, positiveY: 'down' as const},
  ]
  const options = {
    eyeMaximumY: 0.8,
    eyeMinimumY: -0.2,
    eyeScale: 3,
    headCenterX: 20,
    headMaximumX: 9,
    headMinimumX: -3,
    headScale: 3,
  }
  const map = createTrackingParameters(parameters, {}, options)
  expect(map({x: -1, y: -1})).toEqual({'face-x': 17, 'gaze-y': 0.2})
  expect(map({x: 1, y: 1})).toEqual({'face-x': 29, 'gaze-y': -0.8})
  expect(map({x: 0, y: 0})).toEqual({'face-x': 20, 'gaze-y': 0})
})
test('should allow a movement interval entirely on one side of zero', () => {
  const map = createTrackingParameters(
    [{defaultValue: 0, id: 'face-x', maximum: 30, minimum: -30}],
    {},
    {headMaximumX: 8, headMinimumX: 2, headScale: 3},
  )
  expect(map({x: -1, y: 0})['face-x']).toBe(2)
  expect(map({x: 1, y: 0})['face-x']).toBe(8)
})

test('should copy camera rotation at default gains and keep tilt exclusive to pose tracking', () => {
  const parameters = [
    {defaultValue: 0, id: 'FaceX', maximum: 30, minimum: -30},
    {defaultValue: 0, id: 'FaceY', maximum: 30, minimum: -30},
    {defaultValue: 0, id: 'FaceZ', maximum: 30, minimum: -30},
    {defaultValue: 0, id: 'GazeX', maximum: 1, minimum: -1},
    {defaultValue: 0, id: 'GazeY', maximum: 1, minimum: -1},
  ]
  const pose = createTrackingParameters(parameters, {}, {}, 'camera-pose')
  expect(pose({x: 0.5, y: -0.5, z: 0.25}, {x: 0, y: 0}, undefined, {x: -0.5, y: 0.5})).toEqual({
    FaceX: 15,
    FaceY: -15,
    FaceZ: 7.5,
    GazeX: -0.5,
    GazeY: 0.5,
  })
  expect(createTrackingParameters(parameters, {}, {}, 'camera')({x: 0.5, y: 0})).not.toHaveProperty(
    'FaceZ',
  )
  expect(
    createTrackingParameters(parameters, {}, {headLimitZ: 5}, 'camera-pose')({x: 0, y: 0, z: 1})
      .FaceZ,
  ).toBe(5)
})

test('should keep observed body rotation independent from head calibration and scale it with body controls', () => {
  const parameters = [{defaultValue: 2, id: 'BodyX', maximum: 22, minimum: -18}]
  const bindings = {bodyX: {parameterId: 'BodyX'}}
  const map = createTrackingParameters(
    parameters,
    bindings,
    {bodyScale: 0.5, headCenterX: 10, headLimitX: 0, headScale: 0},
    'camera-pose',
  )
  expect(map({x: 1, y: 0}, undefined, {x: -0.5, y: 0}).BodyX).toBe(-3)
  expect(map({x: -1, y: 0}, undefined, {x: 0, y: 0}).BodyX).toBe(2)
  const inverted = createTrackingParameters(
    parameters,
    {bodyX: {...bindings.bodyX, inverted: true}},
    {bodyScale: 1},
    'camera-pose',
  )
  expect(inverted({x: 0, y: 0}, undefined, {x: 1, y: 0}).BodyX).toBe(-18)
})
