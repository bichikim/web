/** @vitest-environment node */
import {expect, it} from 'vitest'

import {trimRepetitiveTail} from '../features/text-generation/answer'

const repeat = (line: string, count: number) => Array.from({length: count}, () => line).join(' ')

it('should trim a fourth identical sentence when the text contains a URL host dot', () => {
  const line = '자세한 내용은 https://example.com 에서 확인하세요.'

  expect(trimRepetitiveTail(repeat(line, 4))).toBe(repeat(line, 3))
})

it('should trim a fourth identical sentence when the text contains a decimal point', () => {
  const line = '원주율은 3.14로 계산합니다.'

  expect(trimRepetitiveTail(repeat(line, 4))).toBe(repeat(line, 3))
})
