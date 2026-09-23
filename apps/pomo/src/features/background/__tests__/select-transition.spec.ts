/** @vitest-environment node */
import {afterEach, expect, it, vi} from 'vitest'
import {DEFAULT_BACKGROUND} from '../model'
import {
  getTransitionSelection,
  selectTransition,
  transitionSelectionPatch,
} from '../select-transition'

afterEach(() => vi.restoreAllMocks())
it('should keep the fixed effect when random playback is disabled', () => {
  expect(selectTransition({...DEFAULT_BACKGROUND, transition: 'circle-open'})).toBe('circle-open')
})
it('should choose only enabled effects including both ends of the pool', () => {
  const preferences = {
    ...DEFAULT_BACKGROUND,
    randomTransitions: true,
    transitionPool: ['circle-open', 'cross-warp'] as const,
  }
  vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.99)
  expect(selectTransition(preferences)).toBe('circle-open')
  expect(selectTransition(preferences)).toBe('cross-warp')
  expect(selectTransition({...preferences, transitionPool: ['cross-warp']})).toBe('cross-warp')
})

it('should map empty, single and multiple selections to playback and restore them', () => {
  for (const effects of [[], ['circle-open'], ['fade', 'rgb-kinetic']] as const) {
    const preferences = {...DEFAULT_BACKGROUND, ...transitionSelectionPatch(effects)}
    expect(getTransitionSelection(preferences)).toEqual(effects)
    expect(preferences.randomTransitions).toBe(effects.length > 1)
    const selected = selectTransition(preferences)
    if (effects.length === 0) {
      expect(selected).toBe('none')
    } else {
      expect(effects).toContain(selected)
    }
  }
})
