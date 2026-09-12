/** @vitest-environment jsdom */
import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import type {SoundLayer} from 'src/features/sound-player'
import {SoundLayerControls} from '../SoundLayerControls'

afterEach(cleanup)

const LAYER: SoundLayer = {id: 'rain', source: '/rain.wav', title: '비', volume: 0.5}

it('should emit changed layer copies and keep the supplied layer unchanged', () => {
  const onChange = vi.fn()
  const result = render(() => <SoundLayerControls layer={LAYER} onChange={onChange} />)
  fireEvent.change(result.getByRole('spinbutton'), {target: {value: '2.5'}})
  expect(onChange).toHaveBeenLastCalledWith({...LAYER, overlapSeconds: 2.5})
  expect(onChange.mock.lastCall?.[0]).not.toBe(LAYER)
  fireEvent.input(result.getByRole('slider'), {target: {value: '0.25'}})
  expect(onChange).toHaveBeenLastCalledWith({...LAYER, volume: 0.25})
  fireEvent.click(result.getByRole('checkbox', {name: '소리 켜기'}))
  expect(onChange).toHaveBeenLastCalledWith({...LAYER, enabled: false})
  fireEvent.click(result.getByRole('checkbox', {name: '반복 재생'}))
  expect(onChange).toHaveBeenLastCalledWith({...LAYER, loop: false})
  expect(LAYER).toEqual({id: 'rain', source: '/rain.wav', title: '비', volume: 0.5})
})

it('should follow changed layer props and disable controls without a change listener', () => {
  const [layer, setLayer] = createSignal(LAYER)
  const [editable, setEditable] = createSignal(true)
  const onChange = vi.fn()
  const result = render(() => (
    <SoundLayerControls layer={layer()} onChange={editable() ? onChange : undefined} />
  ))
  setLayer({...LAYER, id: 'wind', loop: false, title: '바람'})
  expect(result.getByRole('spinbutton')).toBeDisabled()
  fireEvent.input(result.getByRole('slider'), {target: {value: '0.2'}})
  expect(onChange).toHaveBeenLastCalledWith({...layer(), volume: 0.2})
  setEditable(false)
  expect(result.getByRole('slider')).toBeDisabled()
  expect(result.getByRole('checkbox', {name: '소리 켜기'})).toBeDisabled()
  expect(result.getByRole('checkbox', {name: '반복 재생'})).toBeDisabled()
})
