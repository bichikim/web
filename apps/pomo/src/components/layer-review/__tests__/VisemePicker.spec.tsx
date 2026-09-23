/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import {VisemePicker} from '../VisemePicker'
it('should list visemes and emit the selected mouth shape', async () => {
  const onChange = vi.fn()
  render(() => <VisemePicker onChange={onChange} viseme="rest" />)
  const trigger = screen.getByRole('button', {name: /입 모양/})

  fireEvent.keyDown(trigger, {key: 'ArrowDown'})
  expect((await screen.findAllByRole('option')).length).toBeGreaterThan(1)
  fireEvent.click(await screen.findByRole('option', {name: '열린 입 · ㅏ/ㅓ'}))
  expect(onChange).toHaveBeenCalledWith('open')
})
