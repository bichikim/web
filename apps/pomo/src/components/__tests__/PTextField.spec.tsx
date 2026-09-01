/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {PTextField} from '../PTextField'

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
