import {expect, test} from 'vitest'
import {createRuntimeProfile} from '../../../tracking/create-runtime-profile'
import {createDemoDocument} from '@winter-love/puppet/player'
import {deleteGraphCard} from '../delete-graph-card'
const profile = {
  ...createRuntimeProfile(createDemoDocument()),
  mappings: ['face-x', 'mouth-open'].map((parameterId) => ({
    enabled: true,
    input: 'faceYaw' as const,
    inputMaximum: 30,
    inputMinimum: -30,
    outputMaximum: 30,
    outputMinimum: -30,
    parameterId,
    smoothing: 0,
  })),
}
test('should remove a correction and keep its parameter node available', () => {
  const result = deleteGraphCard({id: `mapping:${profile.mappings[0]!.parameterId}`, profile})
  expect(result.profile.mappings).toEqual(profile.mappings.slice(1))
  expect(result.keepParameters).toEqual([profile.mappings[0]!.parameterId])
})
test('should ungroup members when deleting a group', () => {
  const grouped = {
    ...profile,
    groups: [{id: 'face', mode: 'folder' as const, name: 'Face', parameterIds: ['face-x']}],
  }
  const result = deleteGraphCard({id: 'parameter:group:face', profile: grouped})
  expect(result.profile.groups).toEqual([])
  expect(result.keepParameters).toEqual(['face-x'])
  expect(result.profile.mappings).toEqual(profile.mappings)
})
test('should remove a parameter binding and group membership without changing other bindings', () => {
  const id = profile.mappings[0]!.parameterId
  const result = deleteGraphCard({
    id: `parameter:${id}`,
    profile: {...profile, groups: [{id: 'one', mode: 'folder', name: 'One', parameterIds: [id]}]},
  })
  expect(result.profile.groups?.[0]?.parameterIds).toEqual([])
  expect(result.profile.mappings).toEqual(profile.mappings.slice(1))
})
