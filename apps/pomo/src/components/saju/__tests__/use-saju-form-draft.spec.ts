/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {expect, it} from 'vitest'

import {useSajuFormDraft} from '../use-saju-form-draft'

it('should keep the day choices stable when unrelated draft fields change', () => {
  const {cleanup, result} = renderHook(() => useSajuFormDraft({initialDate: '1995-03-16'}))
  const choices = result.dayOptions()

  result.changeDay('17')
  expect(result.selectedDay()).toBe('17')
  expect(result.dayOptions()).toBe(choices)

  result.updateDraft({question: '제 성향은 어떤가요?'})
  expect(result.dayOptions()).toBe(choices)
  cleanup()
})
