import {expect, it} from 'vitest'
import {actionName} from '../action-name'

it('should show English builtin names while retaining action IDs and custom names', () => {
  const action = {id: '외투 벗기', kind: 'expression' as const}
  expect(actionName(action)).toBe('Remove Coat')
  expect(actionName(action, '외투 벗기')).toBe('Remove Coat')
  expect(actionName(action, '내 외투 동작')).toBe('내 외투 동작')
  expect(actionName({id: '노트 들기', kind: 'expression'})).toBe('Hold Notes')
  expect(actionName({id: 'Walk:0', kind: 'motion'})).toBe('Walk Forward')
  expect(actionName({id: '내 인사', kind: 'expression'})).toBe('내 인사')
  expect(actionName({id: '외투 벗기', kind: 'motion'})).toBe('외투 벗기')
  expect(action.id).toBe('외투 벗기')
})

it('should translate the two builtin background motions and retain other authored labels', () => {
  const motion = {id: 'ambient', kind: 'motion' as const}
  expect(actionName(motion, '리본 · 꽃 · 반짝이')).toBe('Ribbons, flowers and sparkles')
  expect(actionName(motion, '거리의 바람')).toBe('Street breeze')
  expect(actionName(motion, '내가 만든 바람')).toBe('내가 만든 바람')
  expect(actionName({id: 'custom', kind: 'motion'}, '거리의 바람')).toBe('거리의 바람')
  expect(actionName({id: 'ambient', kind: 'expression'}, '거리의 바람')).toBe('거리의 바람')
})
