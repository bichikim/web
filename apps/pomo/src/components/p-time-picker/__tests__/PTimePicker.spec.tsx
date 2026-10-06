/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {For} from 'solid-js'
import {expect, it, vi} from 'vitest'
import type {PSelectSingleProps} from '../../p-select/PSelect'
import {PTimePicker} from '../PTimePicker'

vi.mock('../../p-select/PSelect', () => ({
  PSelect: (props: PSelectSingleProps<string>) => (
    <select
      aria-label={props.accessibleLabel}
      disabled={props.disabled}
      value={props.value}
      onChange={(event) => props.onChange(event.currentTarget.value)}
    >
      <For each={props.options}>
        {(option) => <option value={option.value}>{option.label}</option>}
      </For>
    </select>
  ),
}))

it.each([
  ['알림 시간 시', '23', '23:05'],
  ['알림 시간 분', '59', '09:59'],
])('should compose the selected %s with the unchanged time field', (name, value, expected) => {
  const onChange = vi.fn()
  render(() => <PTimePicker label="알림 시간" value="09:05" onChange={onChange} />)
  fireEvent.change(screen.getByRole('combobox', {name}), {target: {value}})
  expect(onChange).toHaveBeenCalledExactlyOnceWith(expected)
})
