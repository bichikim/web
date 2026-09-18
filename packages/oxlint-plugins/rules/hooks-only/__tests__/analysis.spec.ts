import {expect, it} from 'vitest'
import {isSupportFile} from '../analysis.mjs'

it.each([
  ['src/__tests__/nested/logic.ts', true],
  ['src\\__mocks__\\logic.ts', true],
  ['logic.spec.ts', true],
  ['logic.test.client.tsx', true],
  ['logic.e2e.ts', true],
  ['logic.story.tsx', true],
  ['types.d.cts', true],
  ['types.d.mts', true],
  ['logic.spec.', false],
  ['logic.spec./logic.ts', false],
  ['logic.ts', false],
])('should classify support path %s as %s', (filename, expected) => {
  expect(isSupportFile(filename)).toBe(expected)
})

it('should handle repeated support markers without backtracking', () => {
  const repeated = '.e2e.'.repeat(20_000)
  expect(isSupportFile(`${repeated}/logic.ts`)).toBe(false)
  expect(isSupportFile(`${repeated}ts`)).toBe(true)
})
