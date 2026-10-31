import {expect, it} from 'vitest'
import {parseConnectionProfile} from '../connections'
const profile = {
  assetId: 'builtin:ash',
  connections: {
    semanticBindings: [
      {
        enabled: true,
        exclusiveGroup: 'hands',
        id: 'happy',
        mode: 'toggle',
        parameterId: 'Param71',
        releaseWhenUnmatched: true,
        text: '기쁨',
        threshold: 0.7,
      },
    ],
  },
  format: 'poffo-connections',
  version: 1,
}
const options = {assetId: 'builtin:ash', parameters: [{id: 'Param71'}]}
it('should read a versioned JSON profile and preserve connection values', () => {
  expect(parseConnectionProfile(JSON.stringify(profile), options)).toEqual({ok: true, profile})
})
it.each([
  '{broken',
  JSON.stringify({...profile, version: 2}),
  JSON.stringify({
    ...profile,
    connections: {semanticBindings: [{...profile.connections.semanticBindings[0], threshold: 2}]},
  }),
])('should reject invalid JSON or connection values without applying them', (source) => {
  expect(parseConnectionProfile(source, options)).toEqual({ok: false, reason: 'invalid'})
})
it('should reject a builtin profile for a different character', () => {
  expect(parseConnectionProfile(JSON.stringify(profile), {...options, assetId: 'other'})).toEqual({
    ok: false,
    reason: 'character',
  })
})
it('should reject unknown parameters including nested lip-sync shapes', () => {
  const source = JSON.stringify({
    ...profile,
    connections: {
      ...profile.connections,
      lipsync: {shapes: {a: {parameterId: 'missing'}}, source: 'voice'},
    },
  })
  expect(parseConnectionProfile(source, options)).toEqual({ok: false, reason: 'parameter'})
})
