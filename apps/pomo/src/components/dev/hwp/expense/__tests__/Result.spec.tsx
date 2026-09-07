/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {ExpenseResult} from '../Result'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should summarize expenses and block applying unresolved questions', () => {
  const onApply = vi.fn()
  const [questions, setQuestions] = createSignal<readonly string[]>([])
  render(() => (
    <ExpenseResult
      form={{
        date: null,
        items: [{amount: 12000, name: '식사', quantity: 1, unitPrice: 12000}],
        questions: questions(),
        total: 12000,
      }}
      isApplied={false}
      isApplying={false}
      onApply={onApply}
    />
  ))
  expect(screen.getByText('합계 12,000원')).toBeVisible()
  expect(screen.getByRole('table')).toHaveTextContent('식사')
  const button = screen.getByRole('button')
  fireEvent.click(button)
  expect(onApply).toHaveBeenCalledOnce()
  setQuestions(['날짜 확인'])
  expect(screen.getByText('· 날짜 확인')).toBeVisible()
  expect(button).toBeDisabled()
})
