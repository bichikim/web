import {expect, test} from 'vitest'
import {createDemoDocument} from '../../../player'
import {createRuntimeProfile} from '../../../tracking/create-runtime-profile'
import {parseRuntimeProfile} from '../../../tracking/parse-runtime-profile'
import {parseStudioFile} from '../parse-studio-file'
const document = createDemoDocument()
const profile = createRuntimeProfile(document)
const layout = {
  collapsedCorrections: [],
  collapsedGroups: [],
  collapsedInputs: ['manual'],
  extraPorts: ['angle-x'],
  hiddenIds: [],
  positions: [{id: 'manual', x: 123, y: -45}],
  signature: profile.signature,
  version: 1,
}
const settings = {
  ...profile,
  inputs: {buttonValue: 1, manualValue: 0.75},
  localInputIds: ['manualValue', 'buttonValue', 'manualValue:second'],
  view: {camera: {x: 120, y: -80, zoom: 0.75}, fitted: false},
}
const parse = (value: unknown) =>
  parseStudioFile({
    currentProfile: profile,
    parseProfile: (value) => parseRuntimeProfile(value, document),
    value,
  })
test('should restore connections, local inputs and layout from one studio file', () => {
  const result = parse({format: 'puppet-studio', layout, profile: settings, version: 1})
  expect(result?.profile.view).toEqual(settings.view)
  expect(result?.profile.inputs).toEqual(settings.inputs)
  expect(result?.profile.localInputIds).toEqual(settings.localInputIds)
  expect(result?.profile.collapsedInputs).toEqual(['manual'])
  expect(result?.layout?.positions).toEqual(layout.positions)
})
test('should reject incompatible models and invalid profiles or layouts as a whole', () => {
  const file = {format: 'puppet-studio', layout, profile: settings, version: 1}
  expect(parse({...file, profile: {...settings, signature: 'other'}})).toBeUndefined()
  expect(parse({...file, profile: {...settings, inputs: {manualValue: 99}}})).toBeUndefined()
  expect(
    parse({...file, layout: {...layout, positions: [{id: 'manual', x: null, y: 0}]}}),
  ).toBeUndefined()
})
test('should keep importing previously saved layout and profile files', () => {
  expect(parse(layout)?.layout).toEqual(layout)
  expect(parse(settings)?.profile.inputs).toEqual(settings.inputs)
})
