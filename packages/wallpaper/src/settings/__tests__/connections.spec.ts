import {expect, it} from 'vitest'
import {parseConnectionProfile} from '../connections'
import {DEFAULT_POFFO_TOUCH} from '../touch'
const profile = {
  assetId: 'builtin:ash',
  connections: {
    randomActions: {enabled: true, probability: 0.3},
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
        release: 'next-speech',
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
it('should preserve every input profile and validate their connections and calibration', () => {
  const input = {
    ...profile,
    connections: {
      trackingProfiles: {
        camera: {options: {headFollowSpeed: 0.4}},
        'camera-pose': {bindings: {headZ: {parameterId: 'Param71'}}, options: {headLimitZ: 20}},
        cursor: {options: {headFollowSpeed: 1.1}},
      },
    },
  }
  expect(parseConnectionProfile(JSON.stringify(input), options)).toEqual({ok: true, profile: input})
  expect(parseConnectionProfile(JSON.stringify(input), {...options, parameters: []})).toEqual({
    ok: false,
    reason: 'parameter',
  })
  const invalid = {
    ...input,
    connections: {trackingProfiles: {camera: {options: {headFollowSpeed: -1}}}},
  }
  expect(parseConnectionProfile(JSON.stringify(invalid), options)).toEqual({
    ok: false,
    reason: 'invalid',
  })
})
it('should retain touch profiles and reject parameters missing from the selected model', () => {
  const input = {
    ...profile,
    connections: {
      touch: {
        ...DEFAULT_POFFO_TOUCH,
        enabled: true,
        parameters: {Param71: {axis: 'z' as const, invert: true}},
      },
    },
  }
  expect(parseConnectionProfile(JSON.stringify(input), options)).toEqual({ok: true, profile: input})
  expect(parseConnectionProfile(JSON.stringify(input), {...options, parameters: []})).toEqual({
    ok: false,
    reason: 'parameter',
  })
})
it.each([
  {
    enabled: true,
    id: 'tail',
    joints: [{id: 'tip', parameterId: 'missing', response: 1}],
    name: 'Tail',
  },
  {enabled: true, id: 'arm', name: 'Arm', parameters: {wrist: 'missing'}},
  ['Param71', 'Param71', 'missing'],
])('should reject unknown touch joint parameters in every supported chain format (%j)', (chain) => {
  const input = {...profile, connections: {touch: {...DEFAULT_POFFO_TOUCH, chains: [chain]}}}
  expect(parseConnectionProfile(JSON.stringify(input), options)).toEqual({
    ok: false,
    reason: 'parameter',
  })
})
it('should retain joints without a parameter and joints present in the model', () => {
  const input = {
    ...profile,
    connections: {
      touch: {
        ...DEFAULT_POFFO_TOUCH,
        chains: [
          {
            enabled: true,
            id: 'tail',
            joints: [
              {id: 'root', response: 0},
              {id: 'tip', parameterId: 'Param71', response: 1},
            ],
            name: 'Tail',
          },
        ],
      },
    },
  }
  expect(parseConnectionProfile(JSON.stringify(input), options)).toEqual({ok: true, profile: input})
})
it('should preserve state behavior bundles and validate them against the character actions', () => {
  const action = {id: '노트 들기', kind: 'expression' as const}
  const input = {
    ...profile,
    connections: {agentBindings: {working: {actions: [action], parameterId: null}}},
  }
  expect(parseConnectionProfile(JSON.stringify(input), {...options, actions: [action]})).toEqual({
    ok: true,
    profile: input,
  })
  expect(parseConnectionProfile(JSON.stringify(input), {...options, actions: []})).toEqual({
    ok: false,
    reason: 'action',
  })
})
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

it('should reject an unknown action release point', () => {
  const source = JSON.stringify({
    ...profile,
    connections: {
      semanticBindings: [{...profile.connections.semanticBindings[0], release: 'never'}],
    },
  })
  expect(parseConnectionProfile(source, options)).toEqual({ok: false, reason: 'invalid'})
})

it('should load previous candidate lists while using connection switches for eligibility', () => {
  const connections = {randomActions: {bindingIds: [], enabled: true, probability: 0.37}}
  const parsed = parseConnectionProfile(JSON.stringify({...profile, connections}), options)
  expect(parsed).toEqual({
    ok: true,
    profile: {...profile, connections: {randomActions: {enabled: true, probability: 0.37}}},
  })
})

it('should preserve action bundles and validate every target during JSON import', () => {
  const actions = [
    {id: 'smile', kind: 'expression' as const},
    {id: 'wave', kind: 'motion' as const},
  ]
  const input = {
    ...profile,
    connections: {
      semanticBindings: [{...profile.connections.semanticBindings[0], actions, parameterId: null}],
    },
  }
  expect(parseConnectionProfile(JSON.stringify(input), {...options, actions})).toEqual({
    ok: true,
    profile: input,
  })
  expect(
    parseConnectionProfile(JSON.stringify(input), {...options, actions: [actions[0]]}),
  ).toEqual({ok: false, reason: 'action'})
  const duplicated = {
    ...input,
    connections: {
      semanticBindings: [
        {...input.connections.semanticBindings[0], actions: [actions[0], actions[0]]},
      ],
    },
  }
  expect(parseConnectionProfile(JSON.stringify(duplicated), {...options, actions})).toEqual({
    ok: false,
    reason: 'invalid',
  })
})

it('should accept sixteen distinct actions and reject bundles beyond the limit', () => {
  const actions = Array.from({length: 17}, (_, index) => ({
    id: `pose-${index}`,
    kind: 'expression' as const,
  }))
  const source = (targets: typeof actions) =>
    JSON.stringify({
      ...profile,
      connections: {
        semanticBindings: [
          {...profile.connections.semanticBindings[0], actions: targets, parameterId: null},
        ],
      },
    })
  expect(parseConnectionProfile(source(actions.slice(0, 16)), {...options, actions}).ok).toBe(true)
  expect(parseConnectionProfile(source(actions), {...options, actions})).toEqual({
    ok: false,
    reason: 'invalid',
  })
})

it('should preserve registered menu labels and checked state in settings JSON', () => {
  const input = {
    ...profile,
    connections: {
      semanticBindings: [
        {
          ...profile.connections.semanticBindings[0],
          category: 'menu',
          menuActive: true,
          menuLabel: '귀엽게 작아지기',
        },
      ],
    },
  }
  expect(parseConnectionProfile(JSON.stringify(input), options)).toEqual({ok: true, profile: input})
})
