/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {type ExpenseForm} from '../../expense'
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
  const button = screen.getByRole('button', {name: '양식 필드에 적용'})
  expect(onApply).not.toHaveBeenCalled()
  fireEvent.click(button)
  expect(onApply).toHaveBeenCalledOnce()
  setQuestions(['날짜 확인'])
  expect(screen.getByText('· 날짜 확인')).toBeVisible()
  expect(button).toBeDisabled()
  fireEvent.click(button)
  expect(onApply).toHaveBeenCalledOnce()
  setQuestions([])
  expect(screen.queryByText('확인이 필요한 내용')).not.toBeInTheDocument()
  expect(screen.queryByText('· 날짜 확인')).not.toBeInTheDocument()
  expect(button).toBeEnabled()
  expect(onApply).toHaveBeenCalledOnce()
})

it('should preserve exact monetary text, table structure and live updates', () => {
  const onApply = vi.fn()
  const [form, setForm] = createSignal<ExpenseForm>({
    date: null,
    items: [
      {amount: 2469.1356, name: '식사', quantity: 2, unitPrice: 1234.5678},
      {amount: 12345.6789, name: '교통', quantity: 1, unitPrice: 12345.6789},
    ],
    questions: [],
    total: 14814.8145,
  })
  render(() => (
    <ExpenseResult form={form()} isApplied={false} isApplying={false} onApply={onApply} />
  ))

  const heading = screen.getByRole('heading', {level: 3, name: '해석 결과'})
  expect(heading.closest('section')).toHaveAttribute('aria-live', 'polite')
  expect(screen.getByText('합계 14,814.815원').textContent).toBe('합계 14,814.815원')
  const table = screen.getByRole('table')
  expect(
    within(table)
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent),
  ).toEqual(['품목', '단가', '수량', '금액'])
  expect(within(table).getAllByRole('row')).toHaveLength(3)
  expect(
    within(table)
      .getAllByRole('cell')
      .map((cell) => cell.textContent),
  ).toEqual([
    '식사',
    '1,234.568원',
    '2',
    '2,469.136원',
    '교통',
    '12,345.679원',
    '1',
    '12,345.679원',
  ])

  setForm({
    date: null,
    items: [{amount: 9876543.2109, name: '숙박', quantity: 3, unitPrice: 3292181.0703}],
    questions: [],
    total: 9876543.2109,
  })
  expect(screen.getByRole('table')).toBe(table)
  expect(screen.getByText('합계 9,876,543.211원').textContent).toBe('합계 9,876,543.211원')
  expect(within(table).getAllByRole('row')).toHaveLength(2)
  expect(
    within(table)
      .getAllByRole('cell')
      .map((cell) => cell.textContent),
  ).toEqual(['숙박', '3,292,181.07원', '3', '9,876,543.211원'])
  expect(screen.queryByText('합계 14,814.815원')).not.toBeInTheDocument()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(onApply).not.toHaveBeenCalled()
})

it('should restore Apply after applying is cancelled and announce applied state exactly', () => {
  const onApply = vi.fn()
  const [isApplying, setIsApplying] = createSignal(false)
  const [isApplied, setIsApplied] = createSignal(false)
  render(() => (
    <ExpenseResult
      form={{date: null, items: [], questions: [], total: 0}}
      isApplied={isApplied()}
      isApplying={isApplying()}
      onApply={onApply}
    />
  ))
  const button = screen.getByRole('button', {name: '양식 필드에 적용'})
  expect(button).toBeEnabled()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  setIsApplying(true)
  expect(screen.getByRole('button', {name: '양식에 적용 중…'})).toBe(button)
  expect(button).toBeDisabled()
  fireEvent.click(button)
  expect(onApply).not.toHaveBeenCalled()

  setIsApplying(false)
  expect(screen.getByRole('button', {name: '양식 필드에 적용'})).toBe(button)
  expect(button).toBeEnabled()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(onApply).not.toHaveBeenCalled()
  fireEvent.click(button)
  expect(onApply).toHaveBeenCalledOnce()

  setIsApplied(true)
  expect(screen.getByRole('status').textContent).toBe('양식 필드에 적용했어요.')
  expect(screen.getByRole('status')).toBeVisible()
  setIsApplied(false)
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(onApply).toHaveBeenCalledOnce()
})
