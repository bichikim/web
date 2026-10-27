/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {ExpressionSelect} from '../ExpressionSelect'

afterEach(cleanup)

test('should display release state and distinguish it from an expression named none', async () => {
  const changed = vi.fn()
  render(() => {
    const [value, setValue] = createSignal<string>()
    const handleChange = (id: string | undefined) => {
      setValue(id)
      changed(id)
    }
    return (
      <ExpressionSelect
        expressions={[{id: 'none', parameters: []}]}
        value={value()}
        onChange={handleChange}
      />
    )
  })
  const selector = screen.getByRole('button', {name: /표정 선택/})
  expect(selector).toHaveTextContent('표정 해제')
  fireEvent.keyDown(selector, {key: 'ArrowDown'})
  fireEvent.click(await screen.findByRole('option', {name: 'none'}))
  expect(changed).toHaveBeenLastCalledWith('none')
  fireEvent.keyDown(selector, {key: 'ArrowDown'})
  fireEvent.click(await screen.findByRole('option', {name: '표정 해제'}))
  expect(changed).toHaveBeenLastCalledWith(undefined)
  expect(selector).toHaveTextContent('표정 해제')
})
