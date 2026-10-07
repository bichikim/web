import {expect, it} from 'vitest'

import {hasAnswerConflict} from '../has-answer-conflict'

const FACTS = {
  birthYear: 1995,
} as const

it('should reject invented years and unverified counts', () => {
  expect(hasAnswerConflict('2020년생의 2022년 취업운입니다.', FACTS)).toBe(true)
  expect(hasAnswerConflict('2026은 취업에 유리합니다.', FACTS)).toBe(true)
  expect(hasAnswerConflict('재성이 2개이며 관성은 1개입니다.', FACTS)).toBe(true)
  expect(hasAnswerConflict('재성 두 개이며 관성 한 개입니다.', FACTS)).toBe(true)
  expect(hasAnswerConflict('돈과 자원 관리에 관한 분류가 2개입니다.', FACTS)).toBe(true)
  expect(hasAnswerConflict('식상과 관성이 강하게 나타나고 성향이 발달합니다.', FACTS)).toBe(true)
  expect(hasAnswerConflict('활동력이 강하며 자기 주장이 뚜렷합니다.', FACTS)).toBe(true)
  expect(hasAnswerConflict('재물에 해당하는 기운이 없습니다.', FACTS)).toBe(true)
  expect(hasAnswerConflict('재물 운이 부족합니다.', FACTS)).toBe(true)
  expect(hasAnswerConflict('재물 운은 현재로서는 특별히 살펴볼 만한 부분이 없습니다.', FACTS)).toBe(
    true,
  )
})

it('should reject category names and invented variants in user-facing answers', () => {
  expect(hasAnswerConflict('비겁이 1개입니다.', FACTS)).toBe(true)
  expect(hasAnswerConflict('비비겁의 기운이 있습니다.', FACTS)).toBe(true)
  expect(hasAnswerConflict('인성과 재성의 관계를 볼 수 있습니다.', FACTS)).toBe(true)
  expect(hasAnswerConflict('자신을 생하는 에너지가 나타납니다.', FACTS)).toBe(true)
  expect(hasAnswerConflict('사주 기둥에 배움이 있습니다.', FACTS)).toBe(true)
  expect(hasAnswerConflict('일주의 특징을 설명합니다.', FACTS)).toBe(true)
})

it('should accept statements consistent with the calculated facts', () => {
  expect(hasAnswerConflict('1995년생이며 태어난 날을 기준으로 관계를 살펴봅니다.', FACTS)).toBe(
    false,
  )
  expect(hasAnswerConflict('태어난 날의 특징을 설명합니다.', FACTS)).toBe(false)
  expect(hasAnswerConflict('재물운이 없다는 뜻은 아닙니다.', FACTS)).toBe(false)
  expect(hasAnswerConflict('일주일 동안 배워 볼 수 있어요.', FACTS)).toBe(false)
  expect(hasAnswerConflict('새로운 일의 잠재성을 살펴볼 수 있어요.', FACTS)).toBe(false)
})
