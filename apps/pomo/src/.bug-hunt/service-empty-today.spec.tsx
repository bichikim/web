/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {createMemo} from 'solid-js'
import {expect, it} from 'vitest'

import {useLocalDate} from 'src/features/civil-date/use-local-date'
import {calculateService} from 'src/features/tools/calculate-service'

it('should calculate remaining service days before mount when enlistment date is already saved', () => {
  const view = renderHook(() => {
    const today = useLocalDate()
    const result = createMemo(() =>
      calculateService({
        branch: 'army',
        start: '2024-03-01',
        today: today(),
      }),
    )

    return {initialResult: result(), initialToday: today()}
  })

  expect(view.result.initialToday).toBe('')
  expect(view.result.initialResult).not.toBeNull()
  view.cleanup()
})
