/** @vitest-environment jsdom */
import {fireEvent, render} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import type {PuppetParameter, PuppetParameterBinding} from '../../../../player/document'
import {EditorKeyformTrackLabel} from '../EditorKeyformTrackLabel'

const PARAMETERS: readonly PuppetParameter[] = [
  {defaultValue: 1, id: 'x', maximum: 100, minimum: 0, name: 'X'},
  {defaultValue: 2, id: 'y', maximum: 100, minimum: 0, name: 'Y'},
  {defaultValue: 3, id: 'z', maximum: 100, minimum: 0, name: 'Z'},
]

it.each([
  {id: 'one', keyforms: [], parameterIds: ['x']},
  {id: 'two', keyforms: [], parameterIds: ['x', 'y']},
  {id: 'three', keyforms: [], parameterIds: ['x', 'y', 'z']},
] satisfies PuppetParameterBinding[])(
  'should edit the $id dimensional defaults while preserving the other axes',
  (binding) => {
    const onValueChange = vi.fn()
    const view = render(() => (
      <EditorKeyformTrackLabel
        active={false}
        binding={binding}
        parameters={PARAMETERS.slice(0, binding.parameterIds.length)}
        onValueChange={onValueChange}
      />
    ))
    fireEvent.input(view.getByRole('spinbutton', {name: 'X 값'}), {target: {value: '5'}})
    expect(onValueChange).toHaveBeenCalledWith([5, 2, 3].slice(0, binding.parameterIds.length))
  },
)

it('should preserve supplied values when editing another axis', () => {
  const onValueChange = vi.fn()
  const view = render(() => (
    <EditorKeyformTrackLabel
      active={true}
      binding={{id: 'xy', keyforms: [], parameterIds: ['x', 'y']}}
      parameters={PARAMETERS.slice(0, 2)}
      values={[10, 20]}
      onValueChange={onValueChange}
    />
  ))
  fireEvent.input(view.getByRole('spinbutton', {name: 'Y 값'}), {target: {value: '5'}})
  expect(onValueChange).toHaveBeenCalledWith([10, 5])
})

it('should avoid activating or emitting a shortened value tuple when metadata is missing', () => {
  const onBindingActivate = vi.fn()
  const onValueChange = vi.fn()
  const view = render(() => (
    <EditorKeyformTrackLabel
      active={false}
      binding={{id: 'xy', keyforms: [], parameterIds: ['x', 'y']}}
      parameters={PARAMETERS.slice(1, 2)}
      onBindingActivate={onBindingActivate}
      onValueChange={onValueChange}
    />
  ))
  fireEvent.input(view.getByRole('spinbutton', {name: 'Y 값'}), {target: {value: '5'}})
  expect(onValueChange).not.toHaveBeenCalled()
  expect(onBindingActivate).not.toHaveBeenCalled()
})

it('should avoid activating or emitting supplied values with a different dimension', () => {
  const onBindingActivate = vi.fn()
  const onValueChange = vi.fn()
  const view = render(() => (
    <EditorKeyformTrackLabel
      active={false}
      binding={{id: 'xy', keyforms: [], parameterIds: ['x', 'y']}}
      parameters={PARAMETERS.slice(0, 2)}
      values={[10]}
      onBindingActivate={onBindingActivate}
      onValueChange={onValueChange}
    />
  ))
  fireEvent.input(view.getByRole('spinbutton', {name: 'X 값'}), {target: {value: '5'}})
  expect(onValueChange).not.toHaveBeenCalled()
  expect(onBindingActivate).not.toHaveBeenCalled()
})
