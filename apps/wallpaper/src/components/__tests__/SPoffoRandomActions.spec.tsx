/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test} from 'vitest'
import type {RandomActionSettings} from '@winter-love/wallpaper/settings/random-actions'
import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import {SPoffoRandomActions} from '../SPoffoRandomActions'
afterEach(cleanup)
test('should edit chance and behavior candidates without offering emotion expressions', () => {
  const [value, setValue] = createSignal<RandomActionSettings>({
    bindingIds: [],
    enabled: true,
    probability: 0.3,
  })
  const bindings: readonly SemanticBinding[] = [
    {
      action: {id: '노트', kind: 'expression'},
      category: 'behavior',
      enabled: true,
      id: 'notes',
      mode: 'toggle',
      parameterId: null,
      text: '기록',
      threshold: 0.8,
    },
    {
      action: {id: '기쁨', kind: 'expression'},
      category: 'emotion',
      enabled: true,
      id: 'happy',
      mode: 'toggle',
      parameterId: null,
      text: '기뻐요',
      threshold: 0.8,
    },
  ]
  render(() => <SPoffoRandomActions bindings={bindings} value={value()} onChange={setValue} />)
  expect(screen.queryByRole('checkbox', {name: '기쁨'})).toBeNull()
  fireEvent.click(screen.getByRole('checkbox', {name: '노트'}))
  expect(value().bindingIds).toEqual(['notes'])
  const input = screen.getByRole('spinbutton', {name: '랜덤 행동 확률'})
  fireEvent.input(input, {target: {value: '65'}})
  fireEvent.blur(input)
  expect(value().probability).toBe(0.65)
  fireEvent.click(screen.getByRole('switch', {name: '랜덤 행동 사용'}))
  expect(value().enabled).toBe(false)
  expect(screen.queryByRole('spinbutton', {name: '랜덤 행동 확률'})).toBeNull()
})
