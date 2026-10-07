import {expect, it} from 'vitest'

import {getReadableFallback} from '../get-readable-fallback'

const COUNTS = {관성: 2, 비겁: 1, 식상: 2, 인성: 2, 재성: 0}

it('should explain zero wealth count without treating it as missing financial ability', () => {
  const answer = getReadableFallback('제 재물운은 어떤가요?', COUNTS)

  expect(answer).toContain('돈과 자원 관리를 살펴보는 분류는 이번 계산에서 나타나지 않았어요')
  expect(answer).toContain('돈을 벌 능력이 없다는 뜻은 아니에요')
  expect(answer).not.toMatch(/\d+\s*개/u)
  expect(answer).toContain('예를 들면')
  expect(answer?.split('\n\n')).toHaveLength(2)
})

it('should explain a personality category as an example instead of an actual trait', () => {
  const answer = getReadableFallback('제 성향은 어떤가요?', COUNTS)

  expect(answer).toContain('실제 성격을 단정할 수는 없어요')
  expect(answer).toContain('예를 들면')
  expect(answer).toContain('실제로 어떻게 행동하는지는 사주로 알 수 없어요')
  expect(answer).not.toMatch(/\d+\s*개/u)
  expect(answer?.split('\n\n')).toHaveLength(2)
})

it('should describe tied personality categories independently of count key order', () => {
  const reordered = Object.fromEntries([
    ['인성', COUNTS.인성],
    ...Object.entries(COUNTS),
  ]) as typeof COUNTS
  const answer = getReadableFallback('제 성향은 어떤가요?', COUNTS)

  expect(getReadableFallback('제 성향은 어떤가요?', reordered)).toBe(answer)
  expect(answer).toContain('표현과 활동')
  expect(answer).toContain('맡은 역할과 책임')
  expect(answer).not.toMatch(/\d+\s*개/u)
  expect(answer).toContain('배움과 주변의 도움')
})

it('should answer a natural work question without claiming to know actual job fit', () => {
  const answer = getReadableFallback('지금 하는 일이 나한테 맞을까?', COUNTS)

  expect(answer).toContain('사주 계산만으로 단정할 수 없어요')
  expect(answer).toContain('표현과 활동')
  expect(answer).toContain('맡은 역할과 책임')
  expect(answer).not.toMatch(/\d+\s*개/u)
  expect(answer?.split('\n\n')).toHaveLength(2)
})

it('should answer a relationship-future question when generation misses the criteria', () => {
  const answer = getReadableFallback('연애는 어떻게 될까?', COUNTS)

  expect(answer).toContain('사주 계산만으로 알 수 없어요')
  expect(answer).toContain('연애 결과나 시기')
  expect(answer?.split('\n\n')).toHaveLength(2)
})

it('should address both work and wealth in a mixed-topic fallback', () => {
  const answer = getReadableFallback('내 일과 재물운은 어때?', COUNTS)

  expect(answer).toContain('돈과 자원 관리')
  expect(answer).toContain('맡은 역할과 책임')
})

it('should leave other questions and nonzero wealth counts to generation', () => {
  expect(getReadableFallback('제 취미는 어떤가요?', COUNTS)).toBeNull()
  expect(getReadableFallback('제 재물운은 어떤가요?', {...COUNTS, 재성: 1})).toBeNull()
})
