/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import {createSignal} from 'solid-js'

import {PTextField} from '../PTextField'

it.each([false, true])(
  'should render a read-only field without a change callback (multiline: %s)',
  (multiline) => {
    const [value, setValue] = createSignal('처음 값')
    const view = render(() => (
      <PTextField label="내용" readOnly multiline={multiline} value={value()} />
    ))
    const input = view.getByRole('textbox', {name: '내용'})
    expect(input).toHaveAttribute('readonly')
    expect(input).toHaveValue('처음 값')
    setValue('변경된 값')
    expect(input).toHaveValue('변경된 값')
  },
)

it('should connect its label and form contract to the native input', () => {
  const onChange = vi.fn()
  const result = render(() => (
    <PTextField
      autoComplete="email"
      inputMode="email"
      label="이메일"
      name="email"
      onChange={onChange}
      required
      type="email"
      value="admin@pomofi.io"
    />
  ))
  const input = result.getByRole('textbox', {name: '이메일'})

  expect(input.getAttribute('name')).toBe('email')
  expect(input.getAttribute('type')).toBe('email')
  expect(input).toBeRequired()

  fireEvent.input(input, {target: {value: 'next@pomofi.io'}})

  expect(onChange).toHaveBeenCalledWith('next@pomofi.io')
})

it('should associate descriptions and validation errors with the input', () => {
  const result = render(() => (
    <PTextField
      description="관리자 계정에 등록된 주소"
      errorMessage="올바른 이메일을 입력해 주세요."
      label="이메일"
      onChange={() => undefined}
      value="invalid"
    />
  ))
  const input = result.getByRole('textbox', {name: '이메일'})

  expect(input).toHaveAccessibleDescription(
    '관리자 계정에 등록된 주소 올바른 이메일을 입력해 주세요.',
  )
  expect(input).toHaveAttribute('aria-invalid', 'true')
})

it('should render a labeled multiline field with the same change and validation contract', () => {
  const onChange = vi.fn()
  const view = render(() => (
    <PTextField
      multiline
      rows={4}
      label="메모"
      name="memo"
      value={'첫 줄\n둘째 줄'}
      onChange={onChange}
      errorMessage="내용을 확인해 주세요."
    />
  ))
  const input = view.getByRole('textbox', {name: '메모'})
  expect(input.tagName).toBe('TEXTAREA')
  expect(input).toHaveAttribute('rows', '4')
  expect(input).toHaveAttribute('aria-invalid', 'true')
  expect(input).toHaveAccessibleDescription('내용을 확인해 주세요.')
  fireEvent.input(input, {target: {value: '수정\n메모'}})
  expect(onChange).toHaveBeenCalledWith('수정\n메모')
})
