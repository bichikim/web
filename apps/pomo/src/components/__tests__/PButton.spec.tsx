/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
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
    expect(button).toHaveClass('rounded-control')
    expect(button).not.toHaveClass('rounded-panel-inner')
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

    expect(image?.classList.contains('size-8')).toBe(true)
  })

  it('should render explicit size and tone variants', () => {
    const result = render(() => (
      <PButton onPress={() => undefined} size="small" tone="danger" transparent>
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

it.each(['primary', 'secondary'] as const)(
  'should keep %s flat unless raised is enabled',
  (tone) => {
    const flat = render(() => <PButton tone={tone}>평면</PButton>)
    const raised = render(() => (
      <PButton raised tone={tone}>
        입체
      </PButton>
    ))
    const flatButton = flat.getByRole('button', {name: '평면'})
    const raisedButton = raised.getByRole('button', {name: '입체'})

    expect(Array.from(flatButton.classList).some((value) => value.startsWith('shadow-'))).toBe(
      false,
    )
    expect(flatButton).not.toHaveClass('hover:translate-y-[-0.0625rem]')
    expect(Array.from(raisedButton.classList).some((value) => value.startsWith('shadow-'))).toBe(
      true,
    )
    expect(raisedButton).not.toHaveClass('hover:translate-y-[-0.0625rem]')
  },
)

it.each(['primary', 'secondary', 'danger', 'glass'] as const)(
  'should select transparency independently for %s',
  (tone) => {
    const result = render(() => (
      <>
        <PButton tone={tone}>불투명</PButton>
        <PButton tone={tone} transparent>
          반투명
        </PButton>
      </>
    ))
    const opaque = result.getByRole('button', {name: '불투명'})
    const transparent = result.getByRole('button', {name: '반투명'})
    expect(opaque.className).not.toBe(transparent.className)
    expect(opaque).not.toHaveAttribute('transparent')
    expect(transparent).not.toHaveAttribute('transparent')
  },
)

it.each(['primary', 'secondary', 'danger', 'glass'] as const)(
  'should enable backdrop blur independently for %s',
  (tone) => {
    const result = render(() => (
      <>
        <PButton tone={tone} transparent>
          기본
        </PButton>
        <PButton backdropBlur tone={tone} transparent>
          블러
        </PButton>
      </>
    ))
    expect(result.getByRole('button', {name: '기본'})).not.toHaveClass('backdrop-blur-surface')
    expect(result.getByRole('button', {name: '블러'})).toHaveClass('backdrop-blur-surface')
    expect(result.getByRole('button', {name: '블러'})).not.toHaveAttribute('backdropBlur')
  },
)

it.each(['image', 'icon'] as const)('should toggle leading overflow for %s', (kind) => {
  const [overflow, setOverflow] = createSignal(false)
  const result = render(() => (
    <PButton
      leadingImage={kind === 'image' ? 'pomo-smile.png' : undefined}
      icon={kind === 'icon' ? 'i-tabler-player-play' : undefined}
      leadingOverflow={overflow()}
      trailingIcon="i-tabler-arrow-right"
    >
      시작
    </PButton>
  ))
  const button = result.getByRole('button', {name: '시작'})
  const leading = button.firstElementChild
  const trailing = button.querySelector('[data-pomo-button-trailing-icon]')
  expect(leading).toHaveClass(kind === 'image' ? 'size-8' : 'size-6')
  setOverflow(true)
  expect(leading).toHaveClass('size-16', '[margin-block:-1.25rem]')
  expect(trailing).toHaveClass('size-6')
  expect(button).not.toHaveAttribute('leadingOverflow')
  setOverflow(false)
  expect(leading).not.toHaveClass('size-16', '[margin-block:-1.25rem]')
  expect(leading).toHaveClass(kind === 'image' ? 'size-8' : 'size-6')
})

it('should resize both icons reactively with the button size', () => {
  const [size, setSize] = createSignal<'small' | 'medium'>('medium')
  const result = render(() => (
    <PButton size={size()} icon="i-tabler-player-play" trailingIcon="i-tabler-arrow-right">
      시작
    </PButton>
  ))
  const icons = result.getByRole('button').querySelectorAll('[aria-hidden="true"]')
  for (const icon of icons) {
    expect(icon).toHaveClass('size-6')
  }
  setSize('small')
  for (const icon of icons) {
    expect(icon).toHaveClass('size-4.5')
    expect(icon).not.toHaveClass('size-6')
  }
})

it('should resize the leading image with the button size', () => {
  const [size, setSize] = createSignal<'small' | 'medium'>('medium')
  const result = render(() => (
    <PButton size={size()} leadingImage="pomo-smile.png">
      시작
    </PButton>
  ))
  const image = result.container.querySelector('img')
  expect(image).toHaveClass('size-8')
  setSize('small')
  expect(image).toHaveClass('size-6')
  expect(image).not.toHaveClass('size-8')
})

it.each([undefined, null, false, '', '   ', []])(
  'should use compact layout for empty children %j',
  (content) => {
    const result = render(() => (
      <PButton accessibleLabel="재생" icon="i-tabler-player-play">
        {content}
      </PButton>
    ))
    const button = result.getByRole('button', {name: '재생'})
    expect(button).toHaveAttribute('data-icon-only')
    expect(button.children).toHaveLength(1)
  },
)

it('should switch layout when children appear and preserve zero as content', () => {
  const [content, setContent] = createSignal<string | number>('')
  const result = render(() => (
    <PButton accessibleLabel="재생" icon="i-tabler-player-play">
      {content()}
    </PButton>
  ))
  const button = result.getByRole('button', {name: '재생'})
  expect(button).toHaveAttribute('data-icon-only')
  setContent(0)
  expect(button).not.toHaveAttribute('data-icon-only')
  expect(button).toHaveTextContent('0')
  setContent('시작')
  expect(button).not.toHaveAttribute('data-icon-only')
  setContent('')
  expect(button).toHaveAttribute('data-icon-only')
  expect(button.children).toHaveLength(1)
})

it('should keep the button usable without a tooltip provider', () => {
  const onPress = vi.fn()
  const result = render(() => (
    <PButton tooltip="시작 설명" onPress={onPress}>
      시작
    </PButton>
  ))
  const button = result.getByRole('button', {name: '시작'})
  fireEvent.focus(button)
  expect(button).not.toHaveAttribute('aria-describedby')
  expect(button).not.toHaveAttribute('title')
  expect(button).not.toHaveAttribute('tooltip')
  fireEvent.click(button)
  expect(onPress).toHaveBeenCalledWith(button)
})

it.each(['primary', 'secondary', 'danger', 'glass'] as const)(
  'should toggle the border independently for %s',
  (tone) => {
    const [bordered, setBordered] = createSignal(false)
    const result = render(() => (
      <PButton tone={tone} bordered={bordered()}>
        테두리
      </PButton>
    ))
    const button = result.getByRole('button')
    expect(button).not.toHaveClass('hover:border-border-hover')
    setBordered(true)
    expect(button).toHaveClass('hover:border-border-hover')
    expect(button).not.toHaveAttribute('bordered')
    setBordered(false)
    expect(button).not.toHaveClass('hover:border-border-hover')
  },
)

it('should update a customized leading icon without changing its button or accessible name', () => {
  const [iconClass, setIconClass] = createSignal('size-6 text-highlight')
  const result = render(() => (
    <PButton accessibleLabel="설정 열기" icon="i-tabler-settings" iconClass={iconClass()} />
  ))
  const button = result.getByRole('button', {name: '설정 열기'})
  const icon = button.querySelector('[data-pomo-button-icon]')
  expect(icon).toHaveClass('size-6', 'text-highlight')
  setIconClass('size-4 text-danger')
  expect(icon).toHaveClass('size-4', 'text-danger')
  expect(icon).not.toHaveClass('size-6', 'text-highlight')
  expect(result.getByRole('button', {name: '설정 열기'})).toBe(button)
  expect(button).toHaveAttribute('data-icon-only', '')
})

it('should switch focus indicators without overriding the consumer shadow', () => {
  const [focusOutline, setFocusOutline] = createSignal(false)
  const result = render(() => (
    <PButton focusOutline={focusOutline()} class="shadow-none">
      설정
    </PButton>
  ))
  const button = result.getByRole('button', {name: '설정'})
  expect(button).toHaveClass('focus-visible:shadow-focus', 'shadow-none')
  setFocusOutline(true)
  expect(button).not.toHaveClass('focus-visible:shadow-focus')
  expect(button).toHaveClass('focus-visible:outline-3', 'shadow-none')
})

it('should expose a reactive pressed state for tool selection', () => {
  const [pressed, setPressed] = createSignal(false)
  const view = render(() => <PButton pressed={pressed()}>Pen</PButton>)
  const button = view.getByRole('button', {name: 'Pen'})
  expect(button).toHaveAttribute('aria-pressed', 'false')
  setPressed(true)
  expect(button).toHaveAttribute('aria-pressed', 'true')
})
