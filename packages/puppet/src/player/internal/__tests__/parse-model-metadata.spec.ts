import {describe, expect, test} from 'vitest'

import type {PuppetParameter} from '../../document'
import {hasValidParameterGroups} from '../parse-model-metadata'

const CHAINED_GROUP_COUNT = 24_000
// 경과 시간을 단언하지 않고 결과만 확인한다. 그룹마다 루트까지 다시 걷던 제곱 시간 구현은 이
// 입력에서 15초 넘게 걸려, 러너 제한 시간이 기기 속도에 둔감한 느슨한 안전장치로 남는다.
const CHAINED_GROUP_TIMEOUT_MS = 5000

const group = (id: string, groupId?: string) => ({
  id,
  name: id,
  ...(groupId === undefined ? {} : {groupId}),
})

const parameter = (groupId?: string): PuppetParameter => ({
  defaultValue: 0,
  id: 'angle',
  maximum: 1,
  minimum: 0,
  name: 'Angle',
  ...(groupId === undefined ? {} : {groupId}),
})

describe('hasValidParameterGroups', () => {
  test('should accept nested groups whose parents reach a root, in any order', () => {
    const groups = [group('eyes', 'face'), group('face'), group('mouth', 'face')]

    expect(hasValidParameterGroups(groups, [parameter('eyes')])).toBe(true)
    expect(hasValidParameterGroups(undefined, [parameter()])).toBe(true)
  })

  test('should reject cycles, missing parents, duplicate IDs and unknown parameter groups', () => {
    expect(hasValidParameterGroups([group('a', 'b'), group('b', 'a')], [])).toBe(false)
    expect(hasValidParameterGroups([group('root'), group('a', 'a')], [])).toBe(false)
    expect(
      hasValidParameterGroups(
        [group('root'), group('a', 'root'), group('b', 'c'), group('c', 'b')],
        [],
      ),
    ).toBe(false)
    expect(hasValidParameterGroups([group('a', 'missing')], [])).toBe(false)
    expect(hasValidParameterGroups([group('a'), group('a')], [])).toBe(false)
    expect(hasValidParameterGroups([group('a')], [parameter('missing')])).toBe(false)
    expect(hasValidParameterGroups({}, [])).toBe(false)
  })

  test(
    'should validate a long chain of nested groups in linear time',
    () => {
      // 가장 깊은 그룹부터 나열해 그룹마다 루트까지 다시 걸으면 제곱 시간이 걸리는 순서다.
      const groups = Array.from({length: CHAINED_GROUP_COUNT}, (_, index) => {
        const depth = CHAINED_GROUP_COUNT - 1 - index
        return group(`group-${depth}`, depth === 0 ? undefined : `group-${depth - 1}`)
      })

      expect(hasValidParameterGroups(groups, [])).toBe(true)
    },
    CHAINED_GROUP_TIMEOUT_MS,
  )
})
