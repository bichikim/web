import {expect, test} from 'vitest'
import {createDemoDocument} from '../../player'
import {createRuntimeProfile} from '../create-runtime-profile'
import {parseRuntimeProfile} from '../parse-runtime-profile'
import {getRuntimeParameters, parseParameterGroups} from '../parameter-groups'
const document = {
  ...createDemoDocument(),
  parameters: [{defaultValue: 0, id: 'mouth', maximum: 1, minimum: 0, name: 'Mouth'}],
}
const group = {id: 'face', mode: 'broadcast' as const, name: 'Face', parameterIds: ['mouth']}
test('should accept group mappings and roundtrip group membership in profiles', () => {
  const profile = {
    ...createRuntimeProfile(document),
    groups: [group],
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
  }
  expect(parseRuntimeProfile(JSON.parse(JSON.stringify(profile)), document)).toEqual(profile)
  expect(
    getRuntimeParameters(document.parameters, [group]).map((parameter) => parameter.id),
  ).toEqual(['mouth', 'group:face'])
})
test('should reject duplicate memberships, missing parameters, duplicate groups and folder mappings', () => {
  expect(
    parseParameterGroups([group, {...group, id: 'other'}], document.parameters),
  ).toBeUndefined()
  expect(
    parseParameterGroups([{...group, parameterIds: ['missing']}], document.parameters),
  ).toBeUndefined()
  expect(parseParameterGroups([group, group], document.parameters)).toBeUndefined()
  expect(getRuntimeParameters(document.parameters, [{...group, mode: 'folder'}])).toEqual(
    document.parameters,
  )
})
