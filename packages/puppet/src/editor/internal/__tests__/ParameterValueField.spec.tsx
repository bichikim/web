/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'
import {createDemoDocument} from '../../../player'
import {ParameterValueField} from '../ParameterValueField'

test('should update a numeric parameter with its accessible name', () => {
  const onValueChange = vi.fn()
  const view = render(() => (
    <ParameterValueField
      parameter={createDemoDocument().parameters![0]!}
      value={5}
      onValueChange={onValueChange}
    />
  ))
  fireEvent.input(view.getByRole('spinbutton', {name: 'Angle X 값'}), {target: {value: '15'}})
  expect(onValueChange).toHaveBeenLastCalledWith(15)
})

test('should present and update a discrete parameter as named options', async () => {
  const onValueChange = vi.fn()
  const view = render(() => (
    <ParameterValueField
      parameter={{
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
      }}
      value={0}
      onValueChange={onValueChange}
    />
  ))

  const select = view.getByRole('button', {name: '눈동자 무늬 값 기본'})
  expect(select).toHaveTextContent('기본')
  fireEvent.keyDown(select, {key: 'ArrowDown'})
  fireEvent.click(await screen.findByRole('option', {name: '하트'}))
  expect(onValueChange).toHaveBeenLastCalledWith(1)
})
