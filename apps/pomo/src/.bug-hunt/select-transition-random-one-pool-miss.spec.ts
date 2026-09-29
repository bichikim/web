/** @vitest-environment node */
import {afterEach, expect, it, vi} from 'vitest'

import {DEFAULT_BACKGROUND} from '../features/background/model'
import {selectTransition} from '../features/background/select-transition'

afterEach(() => vi.restoreAllMocks())

it('should not fall back to fade when random() is 1 and the pool excludes fade', () => {
  const preferences = {
    ...DEFAULT_BACKGROUND,
    randomTransitions: true,
    transition: 'circle-open',
    transitionPool: ['circle-open', 'cross-warp'] as const,
  }

  vi.spyOn(Math, 'random').mockReturnValue(1)

  const selected = selectTransition({
    ...preferences,
    transitionPool: [...preferences.transitionPool],
  })

  expect(preferences.transitionPool).toContain(selected)
})
