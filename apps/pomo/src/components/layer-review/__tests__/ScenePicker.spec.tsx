/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import {ScenePicker} from '../ScenePicker'
it('should mark and select focus-room preview scenes', () => {
  const onSelect = vi.fn()
  render(() => <ScenePicker onSelect={onSelect} selectedId="day-reading-focused" />)
  const buttons = screen.getAllByRole('button')

  expect(buttons).toHaveLength(12)
  expect(buttons[0]).toHaveAttribute('aria-pressed', 'true')
  expect(buttons[1]).toHaveAttribute('aria-pressed', 'false')
  expect(buttons[0]?.textContent).toContain('preview 01')
  fireEvent.click(buttons[1]!)
  expect(onSelect).toHaveBeenCalledOnce()
})
