/** @vitest-environment jsdom */
import {render, screen} from '@solidjs/testing-library'
import {PRadioSwitch} from 'src/components/PRadioSwitch'
import {beforeEach, expect, it, vi} from 'vitest'
import {Scene} from '../Scene'
vi.mock('src/components/PRadioSwitch', () => ({PRadioSwitch: vi.fn()}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(PRadioSwitch).mockImplementation((props) => (
    <button
      data-scene-style={props.sceneStyle}
      data-value={props.value}
      onClick={() => props.onChange(props.options.at(-1)?.value ?? props.value)}
      type="button"
    >
      {props.label}
    </button>
  ))
})
it('should keep time, activity, and view together in general settings at every layout size', () => {
  render(() => <Scene />)

  const timeControl = screen.getByRole('button', {name: '시간'})
  const activityControl = screen.getByRole('button', {name: '행동'})
  const viewControl = screen.getByRole('button', {name: '보기'})
  const sceneGroup = timeControl.closest('.pomo-settings__scene')

  expect(sceneGroup).not.toHaveClass('lg:hidden')
  expect(viewControl.closest('.pomo-settings__scene')).toBe(sceneGroup)
  expect(activityControl.closest('.pomo-settings__scene')).toBe(sceneGroup)
  expect(activityControl.closest('.lg\\:hidden')).toBeNull()
})
