/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'
import {createDemoDocument} from '../../../player'
import {ParameterValueFields} from '../ParameterValueFields'

test('should change one displayed axis while preserving the other current coordinate', () => {
  const onValueChange = vi.fn()
  const view = render(() => (
    <ParameterValueFields
      parameters={createDemoDocument().parameters!}
      values={[5, 9]}
      onValueChange={onValueChange}
    />
  ))
  fireEvent.input(view.getByRole('spinbutton', {name: 'Angle X 값'}), {target: {value: '15'}})
  expect(onValueChange).toHaveBeenLastCalledWith([15, 9])
  fireEvent.input(view.getByRole('spinbutton', {name: 'Angle Y 값'}), {target: {value: '-10'}})
  expect(onValueChange).toHaveBeenLastCalledWith([5, -10])
})

test('should present and update a discrete parameter as named options', async () => {
  const onValueChange = vi.fn()
  const view = render(() => (
    <ParameterValueFields
      parameters={[
        {
          defaultValue: 0,
          id: 'eye-symbol',
          maximum: 2,
          minimum: 0,
          name: '눈동자 무늬',
          options: [
            {label: '기본', value: 0},
            {label: '하트', value: 1},
            {label: '표고버섯', value: 2},
          ],
        },
      ]}
      values={[0]}
      onValueChange={onValueChange}
    />
  ))

  const select = view.getByRole('button', {name: '눈동자 무늬 값 기본'})
  expect(select).toHaveTextContent('기본')
  fireEvent.keyDown(select, {key: 'ArrowDown'})
  fireEvent.click(await screen.findByRole('option', {name: '하트'}))
  expect(onValueChange).toHaveBeenLastCalledWith([1])
})
