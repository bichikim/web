import {expect, test} from 'vitest'
import {createDemoDocument} from '@winter-love/puppet/player'
import {createRuntimeProfile} from '../create-runtime-profile'
import {mapTrackingValues} from '../map-tracking-values'
import {parseRuntimeProfile} from '../parse-runtime-profile'
import type {ParameterMapping} from '../types'

const mapping: ParameterMapping = {
  enabled: true,
  input: 'mouthOpen',
  inputMaximum: 1,
  inputMinimum: 0,
  outputMaximum: 1,
  outputMinimum: -1,
  parameterId: 'mouth',
  smoothing: 0,
}
test('should clamp and reverse output while omitting unavailable or disabled inputs', () => {
  expect(mapTrackingValues({elapsed: 0, mappings: [mapping], values: {mouthOpen: 2}})).toEqual({
    mouth: 1,
  })
  expect(
    mapTrackingValues({
      elapsed: 0,
      mappings: [{...mapping, outputMaximum: -1, outputMinimum: 1}],
      values: {mouthOpen: 1},
    }),
  ).toEqual({mouth: -1})
  expect(mapTrackingValues({elapsed: 0, mappings: [mapping], values: {}})).toEqual({})
  expect(
    mapTrackingValues({
      elapsed: 0,
      mappings: [{...mapping, enabled: false}],
      values: {mouthOpen: 1},
    }),
  ).toEqual({})
})
test('should produce equal smoothing over equal elapsed time regardless of frame count', () => {
  const mappings = [{...mapping, smoothing: 0.1}]
  const values = {mouthOpen: 1}
  const first = mapTrackingValues({elapsed: 0.05, mappings, previous: {mouth: -1}, values})
  const split = mapTrackingValues({elapsed: 0.05, mappings, previous: first, values})
  const single = mapTrackingValues({elapsed: 0.1, mappings, previous: {mouth: -1}, values})
  expect(split.mouth).toBeCloseTo(single.mouth!)
})
const document = {
  ...createDemoDocument(),
  parameters: [{defaultValue: 0, id: 'mouth-open', maximum: 1, minimum: 0, name: 'Mouth'}],
}
test('should validate roundtripped profiles and keep suggestions disabled', () => {
  const profile = createRuntimeProfile(document)
  expect(profile.mappings[0]?.enabled).toBe(false)
  expect(parseRuntimeProfile(JSON.parse(JSON.stringify(profile)), document)).toEqual(profile)
  expect(parseRuntimeProfile({...profile, signature: 'different'}, document)).toBeUndefined()
  expect(
    parseRuntimeProfile(
      {...profile, mappings: [...profile.mappings, ...profile.mappings]},
      document,
    ),
  ).toBeUndefined()
  expect(
    parseRuntimeProfile(
      {...profile, mappings: [{...profile.mappings[0], outputMaximum: 2}]},
      document,
    ),
  ).toBeUndefined()
})
test('should reject duplicate expression and motion keys regardless of letter case', () => {
  const profile = createRuntimeProfile(document)
  const expressions = [{id: 'smile', key: 'A', name: 'Smile', values: {'mouth-open': 1}}]
  expect(
    parseRuntimeProfile(
      {...profile, expressions, motions: [{key: 'a', motionId: document.motions[0]!.id}]},
      document,
    ),
  ).toBeUndefined()
})

test('should amplify each eye connection independently and keep bipolar input neutral', () => {
  const eye = {...mapping, input: 'eyeBlinkLeft' as const, multiplier: 50, outputMinimum: 0}
  expect(mapTrackingValues({elapsed: 0, mappings: [eye], values: {eyeBlinkLeft: 0.01}})).toEqual({
    mouth: 0.5,
  })
  const angle = {
    ...mapping,
    input: 'faceYaw' as const,
    inputMaximum: 30,
    inputMinimum: -30,
    multiplier: 50,
    outputMaximum: 30,
    outputMinimum: -30,
  }
  expect(mapTrackingValues({elapsed: 0, mappings: [angle], values: {faceYaw: 0}})).toEqual({
    mouth: 0,
  })
  expect(mapTrackingValues({elapsed: 0, mappings: [angle], values: {faceYaw: -1}})).toEqual({
    mouth: -30,
  })
  expect(
    mapTrackingValues({elapsed: 0, mappings: [angle], values: {faceYaw: 0.2}}).mouth,
  ).toBeCloseTo(10)
})
test('should validate saved connection multipliers up to fifty and reject out-of-range values', () => {
  const profile = createRuntimeProfile(document)
  const withMultiplier = (multiplier: number) => ({
    ...profile,
    mappings: [{...profile.mappings[0]!, multiplier}],
  })
  expect(parseRuntimeProfile(withMultiplier(50), document)).toEqual(withMultiplier(50))
  expect(parseRuntimeProfile(withMultiplier(51), document)).toBeUndefined()
  expect(parseRuntimeProfile(withMultiplier(0), document)).toBeUndefined()
})

test('should subtract connection baseline before amplification and retain signed movement', () => {
  const calibrated = {...mapping, baseline: 0.2, multiplier: 2, outputMinimum: 0}
  expect(mapTrackingValues({elapsed: 0, mappings: [calibrated], values: {mouthOpen: 0.2}})).toEqual(
    {mouth: 0},
  )
  expect(
    mapTrackingValues({elapsed: 0, mappings: [calibrated], values: {mouthOpen: 0.4}}).mouth,
  ).toBeCloseTo(0.4)
  const signed = {
    ...mapping,
    baseline: 5,
    input: 'faceYaw' as const,
    inputMaximum: 30,
    inputMinimum: -30,
    multiplier: 2,
    outputMaximum: 30,
    outputMinimum: -30,
  }
  expect(mapTrackingValues({elapsed: 0, mappings: [signed], values: {faceYaw: 5}}).mouth).toBe(0)
  expect(
    mapTrackingValues({elapsed: 0, mappings: [signed], values: {faceYaw: 3}}).mouth,
  ).toBeCloseTo(-4)
})
test('should roundtrip finite baselines and reject nonfinite baselines', () => {
  const profile = createRuntimeProfile(document)
  const withBaseline = (baseline: number) => ({
    ...profile,
    mappings: [{...profile.mappings[0]!, baseline}],
  })
  expect(parseRuntimeProfile(withBaseline(0.25), document)).toEqual(withBaseline(0.25))
  expect(parseRuntimeProfile(withBaseline(Number.NaN), document)).toBeUndefined()
  expect(parseRuntimeProfile(withBaseline(Infinity), document)).toBeUndefined()
})

test('should stop applying tracking while either side is disconnected', () => {
  for (const side of ['inputConnected', 'outputConnected']) {
    expect(
      mapTrackingValues({
        elapsed: 0,
        mappings: [{...mapping, [side]: false}],
        values: {mouthOpen: 0.8},
      }),
    ).toEqual({})
  }
})

test('should persist disconnected ports and reject invalid connection flags', () => {
  const profile = createRuntimeProfile(document)
  const disconnected = {
    ...profile,
    mappings: profile.mappings.map((item) => ({
      ...item,
      inputConnected: false,
      outputConnected: false,
    })),
  }
  expect(parseRuntimeProfile(JSON.parse(JSON.stringify(disconnected)), document)).toEqual(
    disconnected,
  )
  expect(
    parseRuntimeProfile(
      {...profile, mappings: [{...profile.mappings[0]!, inputConnected: 'false'}]},
      document,
    ),
  ).toBeUndefined()
})

test('should restore local input values and mappings while rejecting invalid local values', () => {
  const profile = createRuntimeProfile(document)
  const local = {
    ...profile,
    inputs: {buttonValue: 1, manualValue: 0.4},
    mappings: [{...profile.mappings[0]!, input: 'manualValue'}],
  }
  expect(parseRuntimeProfile(JSON.parse(JSON.stringify(local)), document)).toEqual(local)
  expect(
    parseRuntimeProfile({...local, inputs: {buttonValue: 1, manualValue: Number.NaN}}, document),
  ).toBeUndefined()
  expect(
    parseRuntimeProfile({...local, inputs: {buttonValue: 1, manualValue: 2}}, document),
  ).toBeUndefined()
})

test('should pass direct input values through without calibration, scaling or smoothing', () => {
  const direct = {...mapping, baseline: 0.5, direct: true, multiplier: 20, smoothing: 1}
  expect(
    mapTrackingValues({
      elapsed: 0,
      mappings: [direct],
      previous: {mouth: 0},
      values: {mouthOpen: 0.3},
    }),
  ).toEqual({mouth: 0.3})
  expect(mapTrackingValues({elapsed: 0, mappings: [direct], values: {mouthOpen: 2}})).toEqual({
    mouth: 1,
  })
})
test('should compute an input-connected correction draft before it has an output target', () => {
  expect(
    mapTrackingValues({
      elapsed: 0,
      mappings: [
        {
          ...mapping,
          multiplier: 2,
          outputConnected: false,
          outputMinimum: 0,
          parameterId: 'draft:one',
        },
      ],
      values: {mouthOpen: 0.3},
    }),
  ).toEqual({'draft:one': 0.6})
})
