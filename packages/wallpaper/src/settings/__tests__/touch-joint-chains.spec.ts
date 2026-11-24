import {expect, test} from 'vitest'
import {touchJointChains} from '../touch-joint-chains'
import {DEFAULT_POFFO_TOUCH} from '../touch'

test('should retain legacy selection and weights while converting joint roles', () => {
  const settings = {
    ...DEFAULT_POFFO_TOUCH,
    chains: [['root', 'hinge', 'tip']] as const,
    inverseKinematics: true,
    jointResponse: {elbow: 0.5, shoulder: 0.2, wrist: 0.9},
    parameters: {hinge: {}, root: {}, tip: {}},
  }
  expect(touchJointChains(settings)[0]).toMatchObject({
    enabled: true,
    joints: [
      {parameterId: 'root', response: 0.2},
      {parameterId: 'hinge', response: 0.5},
      {parameterId: 'tip', response: 0.9},
    ],
  })
  expect(touchJointChains({...settings, parameters: {root: {}}})[0]?.enabled).toBe(false)
})

test('should preserve separate named connections without a manual parameter whitelist', () => {
  const chain = {
    enabled: true,
    id: 'custom-arm',
    joints: ['base', 'middle', 'end', 'tip'].map((parameterId) => ({
      id: parameterId,
      parameterId,
      response: 1,
    })),
    name: '오른손',
  }
  expect(
    touchJointChains({...DEFAULT_POFFO_TOUCH, chains: [chain], inverseKinematics: true}),
  ).toEqual([chain])
  expect(
    touchJointChains({...DEFAULT_POFFO_TOUCH, chains: [chain], inverseKinematics: false})[0]
      ?.enabled,
  ).toBe(false)
  expect(chain.enabled).toBe(true)
})
