import {expect, it} from 'vitest'
import {selectAgentActions} from '../select-actions'
import type {CharacterAction} from '../../semantics/types'

const actions: readonly CharacterAction[] = [
  {action: {id: '노트 들기', kind: 'expression'}, label: '노트'},
  {action: {id: '필기 동작', kind: 'expression'}, label: '필기'},
  {action: {id: '긴장', kind: 'expression'}, label: '긴장'},
]
const bindings = {
  approval: {actions: [actions[2].action], parameterId: null},
  working: {actions: [actions[0].action, actions[1].action], parameterId: null},
}
it('should run a complete behavior bundle and prioritize an approval over concurrent work', () => {
  expect(
    selectAgentActions({actions, bindings, signals: {working: true}}).map(
      (item) => item.action.action.id,
    ),
  ).toEqual(['노트 들기', '필기 동작'])
  expect(
    selectAgentActions({actions, bindings, signals: {approval: true, working: true}}).map(
      (item) => item.action.action.id,
    ),
  ).toEqual(['긴장'])
  expect(selectAgentActions({actions, bindings, signals: {}})).toEqual([])
})
it('should ignore unavailable targets and continue to the next configured active state', () => {
  expect(
    selectAgentActions({
      actions: actions.slice(0, 2),
      bindings,
      signals: {approval: true, working: true},
    }).map((item) => item.action.action.id),
  ).toEqual(['노트 들기', '필기 동작'])
})
it('should not run a detail gesture when its required prop is unavailable', () => {
  expect(selectAgentActions({actions: [actions[1]], bindings, signals: {working: true}})).toEqual(
    [],
  )
})
