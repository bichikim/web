/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {describe, expect, it, vi} from 'vitest'

import {PButton} from '../PButton'

describe('PButton', () => {
  it('should render a leading image and trailing icon', () => {
    const result = render(() => (
      <PButton
        leadingImage="pomo-smile.png"
        leadingImageClass="size-16 entry-face"
        onPress={() => undefined}
        tone="glass"
        trailingIcon="i-tabler-arrow-right"
      >
        입장하기
      </PButton>
    ))
    const button = result.getByRole('button', {name: '입장하기'})
    const image = result.container.querySelector('[data-pomo-button-leading-image]')
    const trailingIcon = result.container.querySelector('[data-pomo-button-trailing-icon]')

    expect(button.tagName).toBe('BUTTON')
    expect(image?.getAttribute('src')).toBe('pomo-smile.png')
    expect(image?.classList.contains('size-16')).toBe(true)
    expect(image?.classList.contains('size-6')).toBe(false)
    expect(trailingIcon?.classList.contains('i-tabler-arrow-right')).toBe(true)
  })

  it('should use the default leading image size', () => {
    const result = render(() => (
      <PButton leadingImage="pomo-smile.png" onPress={() => undefined}>
        입장하기
      </PButton>
    ))
    const image = result.container.querySelector('[data-pomo-button-leading-image]')

    expect(image?.classList.contains('size-6')).toBe(true)
  })

  it('should render explicit size and tone variants', () => {
    const result = render(() => (
      <PButton onPress={() => undefined} size="small" tone="danger">
        삭제
      </PButton>
    ))
    const button = result.getByRole('button', {name: '삭제'})

    expect(button.classList.contains('min-h-control-sm')).toBe(true)
    expect(button.classList.contains('text-danger')).toBe(true)
  })

  it('should emit the source button when pressed', () => {
    const onPress = vi.fn()
    const result = render(() => <PButton onPress={onPress}>시작</PButton>)
    const button = result.getByRole('button', {name: '시작'})

    fireEvent.click(button)

    expect(onPress).toHaveBeenCalledWith(button)
  })

  it('should use an optional accessible label instead of compact visual text', () => {
    const result = render(() => (
      <PButton accessibleLabel="99개 모두 중지" onPress={() => undefined}>
        99개
      </PButton>
    ))

    const button = result.getByRole('button', {name: '99개 모두 중지'})

    expect(button).not.toHaveAttribute('title')
  })

  it('should forward an explicit button type', () => {
    const result = render(() => (
      <PButton onPress={() => undefined} type="submit">
        저장
      </PButton>
    ))

    expect(result.getByRole('button', {name: '저장'}).getAttribute('type')).toBe('submit')
  })

  it('should allow native form submission without an onPress callback', () => {
    const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault())
    const result = render(() => (
      <form onSubmit={onSubmit}>
        <PButton type="submit">로그인</PButton>
      </form>
    ))

    fireEvent.click(result.getByRole('button', {name: '로그인'}))

    expect(onSubmit).toHaveBeenCalledOnce()
  })
})
