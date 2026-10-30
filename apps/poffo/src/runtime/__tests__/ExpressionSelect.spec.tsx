/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {ExpressionSelect} from '../ExpressionSelect'

afterEach(cleanup)

test('should retain multiple expressions and release each independently', async () => {
  const changed = vi.fn()
  render(() => {
    const [values, setValues] = createSignal<ReadonlyArray<string>>([])
    const handleChange = (ids: ReadonlyArray<string>) => {
      setValues(ids)
      changed(ids)
    }
    return (
      <ExpressionSelect
        expressions={[
          {id: 'Controller', parameters: []},
          {id: 'Left', parameters: []},
        ]}
        values={values()}
        onChange={handleChange}
      />
    )
  })
  const selector = screen.getByRole('button', {name: /표정 선택/})
  fireEvent.keyDown(selector, {key: 'ArrowDown'})
  fireEvent.click(await screen.findByRole('option', {name: 'Controller'}))
  fireEvent.click(screen.getByRole('option', {name: 'Left'}))
  expect(changed).toHaveBeenLastCalledWith(['Controller', 'Left'])
  expect(screen.getByRole('option', {name: 'Controller'})).toHaveAttribute('aria-selected', 'true')
  fireEvent.click(screen.getByRole('option', {name: 'Left'}))
  expect(changed).toHaveBeenLastCalledWith(['Controller'])
  fireEvent.keyDown(selector, {key: 'Escape'})
  fireEvent.click(screen.getByRole('button', {name: '표정 모두 해제'}))
  expect(changed).toHaveBeenLastCalledWith([])
})
