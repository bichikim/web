/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {For} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import type {SajuFormDraft} from 'src/features/saju/form-draft-storage'
import {SajuForm} from '../SajuForm'

vi.mock('../../p-select/PSelect', () => ({
  PSelect: (props: {
    accessibleLabel?: string
    label: string
    onChange: (value: string) => void
    options: ReadonlyArray<{label: string; value: string}>
    value: string
  }) => (
    <select
      aria-label={props.accessibleLabel ?? props.label}
      value={props.value}
      onChange={(event) => props.onChange(event.currentTarget.value)}
    >
      <For each={props.options}>
        {(option) => <option value={option.value}>{option.label}</option>}
      </For>
    </select>
  ),
}))

afterEach(cleanup)

const createPersistence = () => {
  let stored: SajuFormDraft | null = null
  return {
    delete: vi.fn(() => {
      stored = null
    }),
    read: vi.fn(() => stored),
    write: vi.fn((draft: SajuFormDraft) => {
      stored = draft
    }),
  }
}

const select = (name: string | RegExp) => screen.getByLabelText(name, {selector: 'select'})

it('should restore the selected lunar birth details after remounting', () => {
  const persistence = createPersistence()
  const onSubmit = vi.fn()
  const first = render(() => (
    <SajuForm initialDate="" draftPersistence={persistence} onSubmit={onSubmit} />
  ))

  fireEvent.click(screen.getByRole('radio', {name: '음력'}))
  fireEvent.change(select('음력 연도'), {target: {value: '1995'}})
  fireEvent.change(select('음력 월'), {target: {value: '3'}})
  fireEvent.change(select('음력 일'), {target: {value: '17'}})
  first.unmount()

  render(() => <SajuForm initialDate="" draftPersistence={persistence} onSubmit={onSubmit} />)

  expect(screen.getByRole('radio', {name: '음력'})).toHaveProperty('checked', true)
  expect(select('음력 연도')).toHaveProperty('value', '1995')
  expect(select('음력 월')).toHaveProperty('value', '3')
  expect(select('음력 일')).toHaveProperty('value', '17')
  expect(persistence.write).toHaveBeenCalled()
})

it('should restore the selected time, gender and question after remounting', () => {
  const persistence = createPersistence()
  const onSubmit = vi.fn()
  const first = render(() => (
    <SajuForm initialDate="" draftPersistence={persistence} onSubmit={onSubmit} />
  ))
  fireEvent.click(screen.getByRole('button', {name: /출생 시각.*선택/u}))
  fireEvent.change(select(/출생 시각.*시/u), {
    target: {value: '07'},
  })
  fireEvent.change(select(/출생 시각.*분/u), {
    target: {value: '30'},
  })
  fireEvent.change(select('성별'), {
    target: {value: 'F'},
  })
  fireEvent.input(screen.getByRole('textbox', {name: '질문'}), {
    target: {value: '제 일은 어떨까요?'},
  })
  first.unmount()

  render(() => <SajuForm initialDate="" draftPersistence={persistence} onSubmit={onSubmit} />)

  expect(select(/출생 시각.*시/u)).toHaveProperty('value', '07')
  expect(select(/출생 시각.*분/u)).toHaveProperty('value', '30')
  expect(select('성별')).toHaveProperty('value', 'F')
  expect(screen.getByRole('textbox', {name: '질문'})).toHaveProperty('value', '제 일은 어떨까요?')
  expect(persistence.write).toHaveBeenCalled()
})

it('should keep the solar date through calendar changes, submit it, and clear the draft', () => {
  const persistence = createPersistence()
  const onSubmit = vi.fn()
  const first = render(() => (
    <SajuForm initialDate="" draftPersistence={persistence} onSubmit={onSubmit} />
  ))
  fireEvent.change(select('양력 연도'), {target: {value: '1992'}})
  fireEvent.change(select('양력 월'), {target: {value: '5'}})
  fireEvent.change(select('양력 일'), {target: {value: '13'}})
  fireEvent.click(screen.getByRole('radio', {name: '음력'}))
  first.unmount()

  render(() => <SajuForm initialDate="" draftPersistence={persistence} onSubmit={onSubmit} />)

  fireEvent.click(screen.getByRole('radio', {name: '양력'}))
  fireEvent.submit(screen.getByRole('button', {name: '사주 풀이 생성'}).closest('form')!)
  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({birth: expect.objectContaining({date: '1992-05-13'})}),
  )
  expect(select('양력 연도')).toHaveProperty('value', '1992')
  expect(select('양력 월')).toHaveProperty('value', '5')
  expect(persistence.write).toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', {name: '입력 지우기'}))
  expect(screen.getByRole('textbox', {name: '질문'})).toHaveProperty('value', '')
  expect(select('양력 연도')).toHaveProperty('value', '')
  expect(persistence.delete).toHaveBeenCalledOnce()
})
