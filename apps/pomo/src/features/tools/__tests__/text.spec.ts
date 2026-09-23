/** @vitest-environment node */
import {expect, it} from 'vitest'
import {countText} from '../text'
it('should count visible characters and UTF-8 bytes separately', () => {
  expect(countText('가 A\n')).toEqual({bytes: 6, characters: 4, withoutSpaces: 2})
  expect(countText('👨‍👩‍👧‍👦')).toEqual({bytes: 25, characters: 1, withoutSpaces: 1})
  expect(countText('가').characters).toBe(1)
  expect(countText('').characters).toBe(0)
})
