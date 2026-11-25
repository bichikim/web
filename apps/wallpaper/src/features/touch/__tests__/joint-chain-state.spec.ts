import {expect, test} from 'vitest'
import {jointChainState} from '../joint-chain-state'
const parameters = ['a', 'b', 'c'].map((id) => ({
  axis: 'x' as const,
  defaultValue: 0,
  dimensions: 1,
  id,
  joint: true,
  maximum: 30,
  minimum: -30,
  name: id,
  parts: ['hand'],
}))
const chain = {
  enabled: true,
  id: 'custom',
  joints: ['a', 'b', 'c'].map((parameterId) => ({id: parameterId, parameterId, response: 1})),
  name: '내 팔',
}
test('should validate distinct rotation joints sharing a touched part', () => {
  expect(jointChainState(chain, parameters)).toEqual({kind: 'ready', parameterIds: ['a', 'b', 'c']})
  expect(jointChainState({...chain, joints: [{id: 'empty', response: 1}]}, parameters).kind).toBe(
    'incomplete',
  )
  expect(
    jointChainState(
      {
        ...chain,
        joints: chain.joints.map((joint) =>
          joint.id === 'c' ? {...joint, parameterId: 'missing'} : joint,
        ),
      },
      parameters,
    ).kind,
  ).toBe('missing')
  expect(
    jointChainState(
      {
        ...chain,
        joints: chain.joints.map((joint) =>
          joint.id === 'c' ? {...joint, parameterId: 'a'} : joint,
        ),
      },
      parameters,
    ).kind,
  ).toBe('duplicate')
})
test('should reject unrelated geometry and ordinary XY controls as joint connections', () => {
  expect(
    jointChainState(
      chain,
      parameters.map((p) => (p.id === 'c' ? {...p, parts: ['other']} : p)),
    ).kind,
  ).toBe('unrelated')
  expect(
    jointChainState(
      chain,
      parameters.map((p) => (p.id === 'c' ? {...p, joint: false} : p)),
    ).kind,
  ).toBe('nonrotation')
})
