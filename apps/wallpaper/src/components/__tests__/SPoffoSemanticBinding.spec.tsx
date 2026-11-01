/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterAll, afterEach, beforeAll, expect, test, vi} from 'vitest'
import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import {SPoffoSemanticBinding} from '../SPoffoSemanticBinding'
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
test('should save a named group and return to the default group when it is cleared', () => {
  const [value, setValue] = createSignal<SemanticBinding>({
    enabled: true,
    id: 'test',
    mode: 'toggle',
    parameterId: null,
    text: '기록',
    threshold: 0.8,
  })
  render(() => <SPoffoSemanticBinding value={value()} onChange={setValue} />)
  const input = screen.getByRole('textbox', {name: '연결 그룹'})
  fireEvent.change(input, {target: {value: '  표정  '}})
  expect(value().exclusiveGroup).toBe('표정')
  fireEvent.change(input, {target: {value: ''}})
  expect(value().exclusiveGroup).toBeUndefined()
})

test('should save each action release point while preserving its other settings', () => {
  const [value, setValue] = createSignal<SemanticBinding>({
    action: {id: 'notes', kind: 'expression'},
    enabled: true,
    id: 'test',
    mode: 'toggle',
    parameterId: null,
    text: '작성했어요',
    threshold: 0.84,
  })
  render(() => <SPoffoSemanticBinding value={value()} onChange={setValue} />)
  const select = screen.getByRole('combobox', {name: '연결 해제 시점'})
  expect(select).toHaveTextContent('음성이 끝나면 해제')
  fireEvent.keyDown(select, {key: 'End'})
  fireEvent.keyDown(select, {key: 'Enter'})
  expect(value().release).toBe('next-speech')
  expect(value()).toMatchObject({
    action: {id: 'notes', kind: 'expression'},
    text: '작성했어요',
    threshold: 0.84,
  })
  fireEvent.keyDown(select, {key: 'Home'})
  fireEvent.keyDown(select, {key: 'Enter'})
  expect(value().release).toBe('speech-end')
})
