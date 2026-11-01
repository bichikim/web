import {expect, it} from 'vitest'
import {parseConnectionProfile} from '../connections'
const profile = {
  assetId: 'builtin:ash',
  connections: {
    randomActions: {bindingIds: ['happy'], enabled: true, probability: 0.3},
    semanticBindings: [
      {
        animation: {cycles: 2, period: 1, phase: 0.5},
        category: 'behavior',
        enabled: true,
        excludeText: '아직 시작하지 않았어요.',
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
it('should persist character action targets and reject actions missing from the selected character', () => {
  const action = {id: '노트 들기', kind: 'expression' as const}
  const input = {
    ...profile,
    connections: {
      semanticBindings: [{...profile.connections.semanticBindings[0], action, parameterId: null}],
    },
  }
  const parsed = parseConnectionProfile(JSON.stringify(input), {...options, actions: [action]})
  expect(parsed).toMatchObject({ok: true, profile: input})
  expect(parseConnectionProfile(JSON.stringify(input), {...options, actions: []})).toEqual({
    ok: false,
    reason: 'action',
  })
})
it('should read a versioned JSON profile and preserve connection values', () => {
  expect(parseConnectionProfile(JSON.stringify(profile), options)).toEqual({ok: true, profile})
})
it.each([0, -1, 4])('should reject an out-of-range cursor reach (%s)', (cursorReach) => {
  const source = JSON.stringify({...profile, connections: {trackingOptions: {cursorReach}}})
  expect(parseConnectionProfile(source, options)).toEqual({ok: false, reason: 'invalid'})
})
it('should preserve additive tracking connections in JSON profiles', () => {
  const input = {
    ...profile,
    connections: {
      tracking: 'cursor',
      trackingBindings: {
        eyeY: {blend: 'overwrite', parameterId: null},
        headX: {blend: 'add', inverted: true, parameterId: 'Param71'},
      },
      trackingOptions: {cursorReach: 0.5},
    },
  }
  expect(parseConnectionProfile(JSON.stringify(input), options)).toEqual({ok: true, profile: input})
  const invalid = {
    ...input,
    connections: {trackingBindings: {headX: {blend: 'multiply'}}},
  }
  expect(parseConnectionProfile(JSON.stringify(invalid), options)).toEqual({
    ok: false,
    reason: 'invalid',
  })
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
it.each([0, -1, Number.POSITIVE_INFINITY])(
  'should reject invalid gesture periods (%s)',
  (period) => {
    const source = JSON.stringify({
      ...profile,
      connections: {
        semanticBindings: [{...profile.connections.semanticBindings[0], animation: {period}}],
      },
    })
    expect(parseConnectionProfile(source, options)).toEqual({ok: false, reason: 'invalid'})
  },
)
