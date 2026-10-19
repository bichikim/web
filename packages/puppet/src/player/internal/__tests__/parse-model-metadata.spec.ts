import {describe, expect, test} from 'vitest'

import type {PuppetParameter} from '../../document'
import {hasValidParameterGroups} from '../parse-model-metadata'

const CHAINED_GROUP_COUNT = 24_000
const CHAINED_GROUP_TIME_LIMIT_MS = 1000

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

  test('should validate a long chain of nested groups in linear time', () => {
    // 가장 깊은 그룹부터 나열해 그룹마다 루트까지 다시 걸으면 제곱 시간이 걸리는 순서다.
    const groups = Array.from({length: CHAINED_GROUP_COUNT}, (_, index) => {
      const depth = CHAINED_GROUP_COUNT - 1 - index
      return group(`group-${depth}`, depth === 0 ? undefined : `group-${depth - 1}`)
    })

    const start = performance.now()
    const valid = hasValidParameterGroups(groups, [])
    const elapsed = performance.now() - start

    expect(valid).toBe(true)
    expect(elapsed).toBeLessThan(CHAINED_GROUP_TIME_LIMIT_MS)
  })
})
