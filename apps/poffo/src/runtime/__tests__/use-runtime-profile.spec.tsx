/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {afterEach, expect, test} from 'vitest'
import {createDemoDocument} from '@winter-love/puppet/player'
import {createRuntimeProfile} from '../../tracking/create-runtime-profile'
import {useRuntimeProfile} from '../use-runtime-profile'
afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})
test('should restore legacy browser settings and accept legacy profile files', () => {
  const document = createDemoDocument()
  const defaults = createRuntimeProfile(document)
  const legacy = {
    ...defaults,
    inputs: {buttonValue: 1, manualValue: 0.7},
    mouth: {
      neutral: {mouthOpen: 0.2, mouthRound: 0.1, mouthSpread: 0.3},
      roundSensitivity: 1,
      spreadSensitivity: 1,
    },
    version: 1,
  }
  localStorage.setItem(`puppet:runtime-profile:v1:${defaults.signature}`, JSON.stringify(legacy))
  const {result} = renderHook(() => useRuntimeProfile(() => document))
  expect(result.profile()).toMatchObject({...legacy, version: 2})
  expect(result.parseProfile(legacy)).toEqual(result.profile())
  expect(
    JSON.parse(sessionStorage.getItem(`puppet:runtime-session:v1:${defaults.signature}`)!),
  ).toEqual(result.profile())
})
test('should automatically restore unsaved changes from the current tab session', () => {
  const document = createDemoDocument()
  const first = renderHook(() => useRuntimeProfile(() => document))
  const profile = first.result.profile()!
  first.result.updateProfile({
    ...profile,
    collapsedInputs: ['tracking'],
    inputs: {buttonValue: 1, manualValue: 0.7},
    view: {camera: {x: 120, y: -80, zoom: 0.75}, fitted: false},
  })
  first.cleanup()
  const restored = renderHook(() => useRuntimeProfile(() => document))
  expect(restored.result.profile()?.view).toEqual({
    camera: {x: 120, y: -80, zoom: 0.75},
    fitted: false,
  })
  expect(restored.result.profile()?.inputs).toEqual({buttonValue: 1, manualValue: 0.7})
  expect(restored.result.profile()?.collapsedInputs).toEqual(['tracking'])
})
