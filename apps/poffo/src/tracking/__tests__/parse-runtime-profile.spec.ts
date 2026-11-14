import {expect, test} from 'vitest'
import {createDemoDocument} from '@winter-love/puppet/player'
import {createRuntimeProfile} from '../create-runtime-profile'
import {parseRuntimeProfile} from '../parse-runtime-profile'
const document = {
  ...createDemoDocument(),
  parameters: [{defaultValue: 0, id: 'face-x', maximum: 30, minimum: -30, name: 'Face'}],
}
const profile = createRuntimeProfile(document)
test('should preserve a custom correction name and accept older unnamed mappings', () => {
  expect(parseRuntimeProfile(profile, document)).toBeDefined()
  const named = {
    ...profile,
    mappings: profile.mappings.map((mapping) => ({...mapping, name: '머리 회전'})),
  }
  expect(parseRuntimeProfile(named, document)?.mappings[0]?.name).toBe('머리 회전')
})
test.each(['', '  ', 42])('should reject an invalid correction name %j', (name) => {
  const invalid = {...profile, mappings: profile.mappings.map((mapping) => ({...mapping, name}))}
  expect(parseRuntimeProfile(invalid, document)).toBeUndefined()
})

test('should restore an unbound correction draft and a direct connection', () => {
  const draft = {
    ...profile.mappings[0]!,
    input: 'mouthOpen' as const,
    inputConnected: false,
    inputMaximum: 1,
    inputMinimum: 0,
    outputConnected: false,
    outputMaximum: 1,
    outputMinimum: 0,
    parameterId: 'draft:one',
  }
  const saved = {
    ...profile,
    drafts: ['draft:one'],
    mappings: [{...profile.mappings[0]!, direct: true}, draft],
  }
  expect(parseRuntimeProfile(saved, document)?.mappings).toEqual(saved.mappings)
})
