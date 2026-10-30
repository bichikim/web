import {expect, test} from 'vitest'
import {disconnectGroupMappings} from '../disconnect-group-mappings'
const mapping = {
  enabled: true,
  input: 'manualValue' as const,
  inputMaximum: 1,
  inputMinimum: 0,
  outputMaximum: 1,
  outputMinimum: 0,
  smoothing: 0,
}
test('should remove group and member bindings while preserving unrelated bindings', () => {
  const group = {
    id: 'face',
    mode: 'broadcast' as const,
    name: 'Face',
    parameterIds: ['mouth', 'eye'],
  }
  const mappings = ['group:face', 'mouth', 'eye', 'other'].map((parameterId) => ({
    ...mapping,
    parameterId,
  }))
  expect(disconnectGroupMappings({group, mappings}).map((value) => value.parameterId)).toEqual([
    'other',
  ])
})
