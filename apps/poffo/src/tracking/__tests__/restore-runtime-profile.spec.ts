import {expect, test} from 'vitest'
import {createDemoDocument} from '@winter-love/puppet/player'
import {createRuntimeProfile} from '../create-runtime-profile'
import {restoreRuntimeProfile} from '../restore-runtime-profile'

const document = {
  ...createDemoDocument(),
  parameters: ['mouth-open', 'mouth-round', 'mouth-spread'].map((id) => ({
    defaultValue: 0,
    id,
    maximum: 1,
    minimum: 0,
    name: id,
  })),
}
test('should append enabled mouth tracking without replacing customized legacy mappings', () => {
  const profile = createRuntimeProfile(document)
  const customized = {...profile.mappings[0]!, enabled: true, outputMaximum: 0, outputMinimum: 1}
  const restored = restoreRuntimeProfile(
    {...profile, mappings: [customized], version: 1},
    document,
  )!
  expect(restored.version).toBe(2)
  expect(restored.mappings[0]).toEqual(customized)
  expect(restored.mappings.slice(1).map(({enabled, input}) => ({enabled, input}))).toEqual([
    {enabled: true, input: 'mouthRound'},
    {enabled: true, input: 'mouthSpread'},
  ])
})
test('should preserve disabled or deleted current mappings and reject incompatible models', () => {
  const profile = createRuntimeProfile(document)
  const current = {...profile, mappings: [{...profile.mappings[1]!, enabled: false}]}
  expect(restoreRuntimeProfile(current, document)).toEqual(current)
  expect(
    restoreRuntimeProfile({...profile, signature: 'other', version: 1}, document),
  ).toBeUndefined()
})

test('should migrate legacy mouth sensitivity once while preserving neutral calibration', () => {
  const profile = createRuntimeProfile(document)
  const legacy = {
    ...profile,
    mouth: {
      ...profile.mouth!,
      neutral: {mouthOpen: 0.1, mouthRound: 0.2, mouthSpread: 0.3},
      openSensitivity: 20,
      roundSensitivity: 4,
      spreadSensitivity: 2,
    },
  }
  const restored = restoreRuntimeProfile(legacy, document)!
  expect(restored.mappings.map((mapping) => mapping.multiplier)).toEqual([20, 4, 2])
  expect(restored.mouth!.neutral).toEqual(legacy.mouth.neutral)
  expect(restored.mouth!.openSensitivity).toBe(1)
  expect(restoreRuntimeProfile(restored, document)).toEqual(restored)
})
