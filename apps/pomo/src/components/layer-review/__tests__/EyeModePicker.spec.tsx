/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {EyeModePicker} from '../EyeModePicker'
it('should list eye modes and emit the selected mode', async () => {
  const onChange = vi.fn()
  render(() => <EyeModePicker eyeMode="auto" onChange={onChange} />)
  const trigger = screen.getByRole('button', {name: /눈 깜박임 단계/})

  fireEvent.keyDown(trigger, {key: 'ArrowDown'})
  expect(await screen.findAllByRole('option')).toHaveLength(4)
  fireEvent.click(await screen.findByRole('option', {name: '완전히 감은 눈'}))
  expect(onChange).toHaveBeenCalledWith('closed')
})
