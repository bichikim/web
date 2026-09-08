/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import {PTimePicker} from '../PTimePicker'
it('should select a 24 hour time through headless selects without a native time input', async () => {
  const onChange = vi.fn()
  const {container} = render(() => (
    <PTimePicker label="알림 시간" value="09:05" onChange={onChange} />
  ))
  expect(container.querySelector('input[type=time]')).toBeNull()
  const hour = screen.getByRole('button', {name: '알림 시간 시 09'})
  fireEvent.keyDown(hour, {key: 'ArrowDown'})
  fireEvent.click(await screen.findByRole('option', {name: '23'}))
  expect(onChange).toHaveBeenCalledWith('23:05')
})
