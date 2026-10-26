/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {createDemoDocument} from '@winter-love/puppet/player'
import {createRuntimeProfile} from '../../tracking/create-runtime-profile'
import {useRuntimeControls} from '../use-runtime-controls'

afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})
const document = {
  ...createDemoDocument(),
  parameters: [{defaultValue: 0, id: 'face-x', maximum: 30, minimum: -30, name: 'Face'}],
}
test('should apply restored mouth neutral calibration before connection calibration', () => {
  const source = {
    ...document,
    parameters: [{defaultValue: 0, id: 'mouth-open', maximum: 1, minimum: 0, name: 'Mouth'}],
  }
  const profile = createRuntimeProfile(source)
  localStorage.setItem(
    `puppet:runtime-profile:v1:${profile.signature}`,
    JSON.stringify({
      ...profile,
      mappings: profile.mappings.map((mapping) => ({...mapping, enabled: true, smoothing: 0})),
      mouth: {...profile.mouth, neutral: {mouthOpen: 0.2, mouthRound: 0, mouthSpread: 0}},
    }),
  )
  const {result} = renderHook(() =>
    useRuntimeControls({document: () => source, onMotion: () => undefined}),
  )
  result.handleFrame({timestamp: 1, values: {mouthOpen: 0.2}})
  expect(result.values()['mouth-open']).toBe(0)
  result.handleFrame({timestamp: 2, values: {mouthOpen: 0.6}})
  expect(result.raw()?.mouthOpen).toBe(0.6)
  expect(result.trackingInputs()?.mouthOpen).toBeCloseTo(0.5)
  expect(result.values()['mouth-open']).toBeCloseTo(0.5)
  result.calibrate()
  result.handleFrame({timestamp: 3, values: {mouthOpen: 0.6}})
  expect(result.values()['mouth-open']).toBe(0)
})
test('should prioritize manual values then expressions then tracking and release overrides', () => {
  const {result} = renderHook(() =>
    useRuntimeControls({document: () => document, onMotion: () => undefined}),
  )
  result.updateMapping({...result.profile()!.mappings[0]!, enabled: true, smoothing: 0})
  result.handleFrame({timestamp: 1, values: {faceYaw: 15}})
  expect(result.values()['face-x']).toBe(15)
  result.setManual('face-x', 20)
  result.addExpression('Pose')
  expect(result.values()['face-x']).toBe(20)
  result.setManual('face-x', -5)
  expect(result.values()['face-x']).toBe(-5)
  result.clearManual()
  expect(result.values()['face-x']).toBe(20)
  result.toggleExpression(result.profile()!.expressions[0]!.id)
  result.handleFrame({timestamp: 2, values: {faceYaw: 10}})
  expect(result.values()['face-x']).toBe(10)
  result.calibrate()
  result.handleFrame({timestamp: 3, values: {faceYaw: 10}})
  expect(result.values()['face-x']).toBe(0)
  result.handleFrame({timestamp: 4, values: null})
  expect(result.values()).toEqual({})
})
test('should persist settings and release temporary overrides when replacing the document', () => {
  const [source, setSource] = createSignal(document)
  const {result} = renderHook(() =>
    useRuntimeControls({document: source, onMotion: () => undefined}),
  )
  result.updateMapping({...result.profile()!.mappings[0]!, enabled: true})

  result.setManual('face-x', 20)
  setSource({...document})
  expect(result.values()).toEqual({})
  expect(result.profile()!.mappings[0]!.enabled).toBe(true)
})

test('should retarget a user-selected tracking input while preserving its multiplier and output direction', () => {
  const target = {defaultValue: 0, id: 'custom-eye', maximum: 2, minimum: 0, name: 'Custom Eye'}
  const source = {...document, parameters: [...document.parameters, target]}
  const {result} = renderHook(() =>
    useRuntimeControls({document: () => source, onMotion: () => undefined}),
  )
  result.updateMapping({
    ...result.profile()!.mappings[0]!,
    enabled: true,
    input: 'eyeBlinkRight',
    inputMaximum: 1,
    inputMinimum: 0,
    multiplier: 50,
    outputMaximum: -30,
    outputMinimum: 30,
    smoothing: 0,
  })
  result.retargetMapping('face-x', target)
  expect(result.profile()!.mappings[0]).toMatchObject({
    input: 'eyeBlinkRight',
    multiplier: 50,
    outputMaximum: 0,
    outputMinimum: 2,
    parameterId: 'custom-eye',
  })
  result.handleFrame({timestamp: 1, values: {eyeBlinkRight: 0.01}})
  expect(result.values()).toEqual({'custom-eye': 1})
})

test('should expose raw inputs for connection calibration and clear them on face loss', () => {
  const {result} = renderHook(() =>
    useRuntimeControls({document: () => document, onMotion: () => undefined}),
  )
  result.handleFrame({timestamp: 1, values: {faceYaw: 10}})
  result.calibrate()
  result.handleFrame({timestamp: 2, values: {faceYaw: 12}})
  expect(result.trackingInputs()?.faceYaw).toBe(12)
  result.updateMapping({
    ...result.profile()!.mappings[0]!,
    baseline: result.trackingInputs()!.faceYaw!,
    enabled: true,
    multiplier: 2,
    smoothing: 0,
  })
  result.handleFrame({timestamp: 3, values: {faceYaw: 12}})
  expect(result.values()['face-x']).toBe(0)
  result.handleFrame({timestamp: 4, values: {faceYaw: 13}})
  expect(result.values()['face-x']).toBeCloseTo(2)
  result.handleFrame({timestamp: 5, values: null})
  expect(result.trackingInputs()).toBeNull()
})

test('should calibrate all available connections together and preserve settings and unavailable baselines', () => {
  const source = {
    ...document,
    parameters: [
      ...document.parameters,
      {defaultValue: 0, id: 'mouth-open', maximum: 1, minimum: 0, name: 'Mouth'},
      {defaultValue: 0, id: 'eye-left', maximum: 1, minimum: 0, name: 'Eye'},
    ],
  }
  const [current, setCurrent] = createSignal(source)
  const {result} = renderHook(() =>
    useRuntimeControls({document: current, onMotion: () => undefined}),
  )
  for (const mapping of result.profile()!.mappings) {
    result.updateMapping({...mapping, baseline: 0.1, multiplier: 3, smoothing: 0})
  }
  result.handleFrame({timestamp: 1, values: {faceYaw: 7, mouthOpen: 0.2}})
  const before = result.profile()!.mappings
  result.calibrateMappings(result.trackingInputs())
  expect(result.profile()!.mappings).toEqual(
    before.map((mapping) => ({
      ...mapping,
      baseline: mapping.input === 'faceYaw' ? 7 : mapping.input === 'mouthOpen' ? 0.2 : 0.1,
    })),
  )

  setCurrent({...source})
  expect(result.profile()!.mappings.find((mapping) => mapping.input === 'faceYaw')?.baseline).toBe(
    7,
  )
  const saved = result.profile()
  result.calibrateMappings(null)
  expect(result.profile()).toBe(saved)
  result.calibrateMappings({mouthOpen: Number.NaN})
  expect(result.profile()).toEqual(saved)
})

test('should apply saved manual and button inputs without a camera and retain them after camera loss', () => {
  vi.stubGlobal('requestAnimationFrame', undefined)
  try {
    const [current, setCurrent] = createSignal(document)
    const {result} = renderHook(() =>
      useRuntimeControls({document: current, onMotion: () => undefined}),
    )
    result.updateMapping({
      ...result.profile()!.mappings[0]!,
      enabled: true,
      input: 'manualValue',
      inputMaximum: 1,
      inputMinimum: 0,
      outputMinimum: 0,
      smoothing: 0,
    })
    result.setInputValue('manualValue', 0.5)
    expect(result.values()['face-x']).toBe(15)
    result.handleFrame({timestamp: 1, values: null})
    expect(result.values()['face-x']).toBe(15)
    result.updateMapping({...result.profile()!.mappings[0]!, input: 'buttonValue'})
    result.setInputValue('buttonValue', 1)
    expect(result.values()['face-x']).toBe(30)

    setCurrent({...document})
    expect(result.inputValues()).toEqual({buttonValue: 1, manualValue: 0.5})
    expect(result.values()['face-x']).toBe(30)
  } finally {
    vi.unstubAllGlobals()
  }
})

test('should apply a persisted group input while rejecting direct parameter overrides', () => {
  vi.stubGlobal('requestAnimationFrame', undefined)
  try {
    const [current, setCurrent] = createSignal(document)
    const {result} = renderHook(() =>
      useRuntimeControls({document: current, onMotion: () => undefined}),
    )
    result.updateProfile({
      ...result.profile()!,
      groups: [{id: 'face', mode: 'broadcast', name: 'Face', parameterIds: ['face-x']}],
      mappings: [
        {
          enabled: true,
          input: 'manualValue',
          inputMaximum: 1,
          inputMinimum: 0,
          outputMaximum: 1,
          outputMinimum: 0,
          parameterId: 'group:face',
          smoothing: 0,
        },
      ],
    })
    result.setInputValue('manualValue', 0.75)
    expect(result.values()).toEqual({'face-x': 15})
    expect(result.mappedValues()['group:face']).toBe(0.75)
    result.setManual('face-x', 4)
    expect(result.values()['face-x']).toBe(15)
    result.clearManual()
    expect(result.values()['face-x']).toBe(15)

    setCurrent({...document})
    expect(result.values()['face-x']).toBe(15)
    expect(result.profile()?.groups?.[0]?.parameterIds).toEqual(['face-x'])
  } finally {
    vi.unstubAllGlobals()
  }
})

test('should calibrate mouth through the same connection baseline and sensitivity as other inputs', () => {
  const source = {
    ...document,
    parameters: [
      ...document.parameters,
      {defaultValue: 0, id: 'mouth', maximum: 1, minimum: 0, name: 'Mouth'},
    ],
  }
  const {result} = renderHook(() =>
    useRuntimeControls({document: () => source, onMotion: () => undefined}),
  )
  result.updateMapping({...result.profile()!.mappings[0]!, enabled: true, smoothing: 0})
  result.updateMapping({
    enabled: true,
    input: 'mouthOpen',
    inputMaximum: 1,
    inputMinimum: 0,
    multiplier: 2,
    outputMaximum: 1,
    outputMinimum: 0,
    parameterId: 'mouth',
    smoothing: 0,
  })
  result.handleFrame({timestamp: 1, values: {faceYaw: 10, mouthOpen: 0.2}})
  result.calibrate()
  expect(
    result.profile()?.mappings.find((mapping) => mapping.parameterId === 'mouth')?.baseline,
  ).toBe(0.2)
  result.handleFrame({timestamp: 2, values: {faceYaw: 10, mouthOpen: 0.4}})
  expect(result.trackingInputs()?.mouthOpen).toBe(0.4)
  expect(result.values().mouth).toBeCloseTo(0.4)
  expect(result.values()['face-x']).toBe(0)
})

test('should expose correction output separately from temporary manual overrides', () => {
  const {result} = renderHook(() =>
    useRuntimeControls({document: () => document, onMotion: () => undefined}),
  )
  result.updateMapping({
    ...result.profile()!.mappings[0]!,
    baseline: 5,
    enabled: true,
    multiplier: 2,
    smoothing: 0,
  })
  result.handleFrame({timestamp: 1, values: {faceYaw: 10}})
  result.setManual('face-x', 25)
  expect(result.mappingInputs().faceYaw).toBe(10)
  expect(result.correctionValues()['face-x']).toBe(10)
  expect(result.values()['face-x']).toBe(25)
  result.handleFrame({timestamp: 2, values: null})
  expect(result.correctionValues()['face-x']).toBeUndefined()
})
