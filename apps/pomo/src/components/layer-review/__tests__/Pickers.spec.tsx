/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {EyeModePicker} from '../EyeModePicker'
import {ScenePicker} from '../ScenePicker'
import {VisemePicker} from '../VisemePicker'

it('should list eye modes and emit the selected mode', () => {
  const onChange = vi.fn()
  render(() => <EyeModePicker eyeMode="auto" onChange={onChange} />)
  const select = screen.getByRole('combobox', {name: /눈 깜박임 단계/})

  expect(screen.getAllByRole('option')).toHaveLength(4)
  fireEvent.change(select, {target: {value: 'closed'}})
  expect(onChange).toHaveBeenCalledWith('closed')
})

it('should list visemes and emit the selected mouth shape', () => {
  const onChange = vi.fn()
  render(() => <VisemePicker onChange={onChange} viseme="rest" />)
  const select = screen.getByRole('combobox', {name: /입 모양/})

  expect(screen.getAllByRole('option').length).toBeGreaterThan(1)
  fireEvent.change(select, {target: {value: 'open'}})
  expect(onChange).toHaveBeenCalledWith('open')
})

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
