/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterAll, afterEach, beforeAll, expect, it, vi} from 'vitest'
import type {AgentStateBindings} from '@winter-love/wallpaper/settings/agent-state'
import {SPoffoAgentStateSettings} from '../SPoffoAgentStateSettings'

const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
beforeAll(() =>
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {configurable: true, value: vi.fn()}),
)
afterAll(() => {
  if (original === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', original)
  }
})
afterEach(cleanup)
it('should configure a state target and independent on/off values without removing other connections', () => {
  const [value, setValue] = createSignal<AgentStateBindings>({question: {parameterId: 'wait'}})
  render(() => (
    <SPoffoAgentStateSettings
      value={value()}
      onChange={setValue}
      parameters={[{defaultValue: 0, id: 'wait', maximum: 1, minimum: -1, name: '대기'}]}
    />
  ))
  fireEvent.click(screen.getByRole('combobox', {name: '작업 중 상태 파라미터'}))
  fireEvent.click(screen.getByRole('option', {name: '대기'}))
  expect(value().working).toEqual({parameterId: 'wait'})
  const on = screen.getByRole('spinbutton', {name: '작업 중 ON 값'})
  fireEvent.input(on, {target: {value: '0.7'}})
  fireEvent.blur(on)
  expect(value().working?.on).toBe(0.7)
  expect(value().question?.parameterId).toBe('wait')
  fireEvent.click(screen.getByRole('combobox', {name: '작업 중 상태 파라미터'}))
  fireEvent.click(screen.getByRole('option', {name: '연결 안 함'}))
  expect(value().working?.parameterId).toBeNull()
  expect(screen.queryByRole('spinbutton', {name: '작업 중 ON 값'})).not.toBeInTheDocument()
})
