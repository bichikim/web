/** @vitest-environment jsdom */
import {cleanup, render} from '@solidjs/testing-library'
import {PSwitch} from 'src/components/PSwitch'
import {afterEach, expect, it, vi} from 'vitest'
import {Style} from '../Style'
vi.mock('src/components/PSwitch', () => ({PSwitch: vi.fn()}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should translate the style switch into original and scribble values', () => {
  const onSceneStyleChange = vi.fn()
  render(() => <Style sceneStyle="scribble" onSceneStyleChange={onSceneStyleChange} />)
  const props = vi.mocked(PSwitch).mock.calls[0]![0]
  expect(props.checked).toBe(true)
  props.onChange(false)
  expect(onSceneStyleChange).toHaveBeenLastCalledWith('original')
  props.onChange(true)
  expect(onSceneStyleChange).toHaveBeenLastCalledWith('scribble')
})
