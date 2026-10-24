import {expect, it} from 'vitest'
import {agentParameters} from '../parameters'

const parameter = {defaultValue: 0, id: 'busy', maximum: 1, minimum: 0}
it('should map each active state to its on value and clamp authored values to model bounds', () => {
  const bindings = {working: {off: 0.2, on: 2, parameterId: 'busy'}}
  expect(agentParameters([parameter], bindings, {working: true})).toEqual({busy: 1})
  expect(agentParameters([parameter], bindings, {})).toEqual({busy: 0.2})
  expect(agentParameters([parameter], {question: {parameterId: 'busy'}}, {question: true})).toEqual(
    {busy: 1},
  )
})
it('should combine states sharing a parameter with active connections winning over inactive ones', () => {
  const bindings = {question: {parameterId: 'busy'}, working: {parameterId: 'busy'}}
  expect(agentParameters([parameter], bindings, {working: true})).toEqual({busy: 1})
  expect(agentParameters([parameter], bindings, {question: true})).toEqual({busy: 1})
  expect(agentParameters([parameter], bindings, {})).toEqual({busy: 0})
  expect(agentParameters([parameter], {error: {parameterId: 'missing'}}, {error: true})).toEqual({})
})
