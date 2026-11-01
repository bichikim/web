/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test} from 'vitest'
import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import {SPoffoSemanticBinding} from '../SPoffoSemanticBinding'
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
