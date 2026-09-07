/** @vitest-environment jsdom */

import {render as baseRender, cleanup, fireEvent, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createSignal, type JSX} from 'solid-js'
import {PTooltip} from '../PTooltip'

import {PTooltipContent, PTooltipProvider, useTooltipTrigger} from '../tooltip'

const render: typeof baseRender = (ui, options) =>
  baseRender(
    () => (
      <PTooltipProvider>
        {ui()}
        <PTooltipContent />
      </PTooltipProvider>
    ),
    options,
  )
const Trigger = (props: {
  label: string
  children: (
    bindings: ReturnType<typeof useTooltipTrigger>['events'] & {
      ref: (element: HTMLElement) => void
    },
  ) => JSX.Element
}) => {
  const trigger = useTooltipTrigger()
  return (
    <>
      {props.children({...trigger.events, ref: trigger.setTarget})}
      <PTooltip target={trigger.target()} show={trigger.show()} text={props.label} />
    </>
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  const matches = HTMLElement.prototype.matches
  vi.spyOn(HTMLElement.prototype, 'matches').mockImplementation(
    function matchesFocus(this: HTMLElement, selector) {
      return selector === ':focus-visible'
        ? this.hasAttribute('data-test-visible-focus')
        : matches.call(this, selector)
    },
  )
  vi.stubGlobal('CSS', {supports: () => true})
  vi.stubGlobal('PointerEvent', MouseEvent)
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {
    configurable: true,
    value: vi.fn(),
  })
  Object.defineProperty(HTMLElement.prototype, 'hidePopover', {
    configurable: true,
    value: vi.fn(),
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
  Reflect.deleteProperty(HTMLElement.prototype, 'hidePopover')
})

const renderTooltip = () =>
  render(() => (
    <Trigger label="설정 열기">
      {(trigger) => (
        <button {...trigger} type="button">
          설정
        </button>
      )}
    </Trigger>
  ))

it('should open after hovering and connect the description without moving focus', () => {
  const result = renderTooltip()
  const button = result.getByRole('button')
  fireEvent.pointerEnter(button)
  vi.advanceTimersByTime(399)
  expect(button).not.toHaveAttribute('aria-describedby')
  vi.advanceTimersByTime(1)
  const tooltip = screen.getByRole('tooltip')
  expect(tooltip).toHaveTextContent('설정 열기')
  expect(tooltip).toHaveAttribute('popover', 'manual')
  expect(button).toHaveAttribute('aria-describedby', tooltip.id)
  expect(tooltip.showPopover).toHaveBeenCalled()
  expect(button).not.toHaveFocus()
})

it('should cancel a pending hover when the pointer leaves', () => {
  const result = renderTooltip()
  const button = result.getByRole('button')
  fireEvent.pointerEnter(button)
  fireEvent.pointerLeave(button)
  vi.advanceTimersByTime(1000)
  expect(button).not.toHaveAttribute('aria-describedby')
})

it('should remain open while moving onto the tooltip and dismiss with Escape', () => {
  const result = renderTooltip()
  const button = result.getByRole('button')
  fireEvent.pointerEnter(button)
  vi.advanceTimersByTime(400)
  fireEvent.pointerLeave(button)
  fireEvent.pointerEnter(screen.getByRole('tooltip'))
  vi.advanceTimersByTime(500)
  expect(button).toHaveAttribute('aria-describedby')
  fireEvent.keyDown(document, {key: 'Escape'})
  expect(button).not.toHaveAttribute('aria-describedby')
})

it('should not open on pointer-originated restored focus', () => {
  const result = renderTooltip()
  const button = result.getByRole('button')
  button.focus()
  vi.advanceTimersByTime(500)
  expect(button).toHaveFocus()
  expect(button).not.toHaveAttribute('aria-describedby')
  button.blur()
  button.focus()
  vi.advanceTimersByTime(500)
  expect(button).not.toHaveAttribute('aria-describedby')
})

it('should show for visible focus and retain it until blur', () => {
  const result = renderTooltip()
  const button = result.getByRole('button')
  button.setAttribute('data-test-visible-focus', '')
  button.focus()
  expect(button).toHaveAttribute('aria-describedby')
  fireEvent.pointerEnter(button)
  fireEvent.pointerLeave(button)
  vi.advanceTimersByTime(500)
  expect(button).toHaveAttribute('aria-describedby')
  button.blur()
  vi.advanceTimersByTime(150)
  expect(button).not.toHaveAttribute('aria-describedby')
})

it('should replace the previous tooltip when another trigger is hovered', () => {
  const result = render(() => (
    <>
      <Trigger label="첫 번째">{(trigger) => <button {...trigger}>첫째</button>}</Trigger>
      <Trigger label="두 번째">{(trigger) => <button {...trigger}>둘째</button>}</Trigger>
    </>
  ))
  const buttons = result.getAllByRole('button')
  fireEvent.pointerEnter(buttons[0]!)
  vi.advanceTimersByTime(400)
  fireEvent.pointerEnter(buttons[1]!)
  vi.advanceTimersByTime(400)
  expect(buttons[0]).not.toHaveAttribute('aria-describedby')
  expect(buttons[1]).toHaveAttribute('aria-describedby')
})

it('should preserve touch activation without opening a tooltip', () => {
  const result = renderTooltip()
  const button = result.getByRole('button')
  const event = new Event('pointerenter')
  Object.defineProperty(event, 'pointerType', {value: 'touch'})
  fireEvent(button, event)
  fireEvent.pointerDown(button)
  fireEvent.focus(button)
  vi.advanceTimersByTime(500)
  expect(button).not.toHaveAttribute('aria-describedby')
})

it('should provide a native title when top-layer anchor positioning is unavailable', () => {
  vi.stubGlobal('CSS', {supports: () => false})
  const result = renderTooltip()
  const button = result.getByRole('button')
  expect(button).not.toHaveAttribute('title')
  fireEvent.pointerEnter(button)
  vi.advanceTimersByTime(400)
  expect(button).toHaveAttribute('title', '설정 열기')
  expect(button).not.toHaveAttribute('aria-describedby')
})

it('should clear pending work when unmounted', () => {
  const result = renderTooltip()
  fireEvent.pointerEnter(result.getByRole('button'))
  result.unmount()
  expect(vi.getTimerCount()).toBe(0)
})

it('should close on pointer leave while preserving button focus', () => {
  const result = renderTooltip()
  const button = result.getByRole('button')
  button.focus()
  fireEvent.pointerEnter(button)
  vi.advanceTimersByTime(400)
  expect(button).toHaveAttribute('aria-describedby')
  fireEvent.pointerLeave(button)
  vi.advanceTimersByTime(150)
  expect(button).toHaveFocus()
  expect(button).not.toHaveAttribute('aria-describedby')
})

it('should update the visible description when the action label changes', () => {
  const [label, setLabel] = createSignal('시작')
  const result = render(() => (
    <Trigger label={label()}>{(trigger) => <button {...trigger}>타이머</button>}</Trigger>
  ))
  fireEvent.pointerEnter(result.getByRole('button'))
  vi.advanceTimersByTime(400)
  setLabel('일시 정지')
  expect(screen.getByRole('tooltip')).toHaveTextContent('일시 정지')
})

it('should cancel showing a trigger that becomes disabled during the hover delay', () => {
  const [disabled, setDisabled] = createSignal(false)
  const result = render(() => (
    <Trigger label="이전 곡">
      {(trigger) => (
        <button {...trigger} disabled={disabled()}>
          이전
        </button>
      )}
    </Trigger>
  ))
  const button = result.getByRole('button')
  fireEvent.pointerEnter(button)
  setDisabled(true)
  vi.advanceTimersByTime(400)
  expect(button).not.toHaveAttribute('aria-describedby')
  fireEvent.pointerEnter(button)
  vi.advanceTimersByTime(400)
  expect(button).not.toHaveAttribute('aria-describedby')
})

it('should close on scroll and remove global listeners on unmount', () => {
  const result = renderTooltip()
  const button = result.getByRole('button')
  fireEvent.pointerEnter(button)
  vi.advanceTimersByTime(400)
  fireEvent.scroll(document)
  expect(button).not.toHaveAttribute('aria-describedby')
  fireEvent.pointerEnter(button)
  vi.advanceTimersByTime(400)
  result.unmount()
  const escape = new KeyboardEvent('keydown', {cancelable: true, key: 'Escape'})
  document.dispatchEvent(escape)
  expect(escape.defaultPrevented).toBe(false)
  expect(vi.getTimerCount()).toBe(0)
})

it('should write anchor and description attributes onto custom media elements', () => {
  const result = render(() => (
    <Trigger label="재생 또는 일시 정지">{(trigger) => <media-play-button {...trigger} />}</Trigger>
  ))
  const button = result.container.querySelector('media-play-button')!
  fireEvent.pointerEnter(button)
  vi.advanceTimersByTime(400)
  expect(button).toHaveAttribute('data-pomo-tooltip-trigger', '')
  expect(button).toHaveAttribute('aria-describedby', screen.getByRole('tooltip').id)
  fireEvent.blur(button)
  vi.advanceTimersByTime(150)
  expect(button).not.toHaveAttribute('aria-describedby')
})

it('should do nothing without a provider', () => {
  const [target, setTarget] = createSignal<HTMLElement>()
  const result = baseRender(() => (
    <>
      <button ref={setTarget}>대상</button>
      <PTooltip target={target()} show text="설명" />
    </>
  ))
  expect(screen.queryByRole('tooltip')).toBeNull()
  expect(result.getByRole('button')).not.toHaveAttribute('aria-describedby')
  expect(result.getByRole('button')).not.toHaveAttribute('title')
})

it('should accept controlled visibility and text and ignore a missing target', () => {
  const [target, setTarget] = createSignal<HTMLElement>()
  const [show, setShow] = createSignal(false)
  const [text, setText] = createSignal('설명')
  const result = render(() => <PTooltip target={target()} show={show()} text={text()} />)
  setShow(true)
  expect(screen.queryByRole('tooltip')).toBeNull()
  const button = document.createElement('button')
  document.body.append(button)
  setTarget(button)
  expect(screen.getByRole('tooltip')).toHaveTextContent('설명')
  setText('변경')
  expect(screen.getByRole('tooltip')).toHaveTextContent('변경')
  setShow(false)
  vi.advanceTimersByTime(150)
  expect(screen.queryByRole('tooltip')).toBeNull()
  button.remove()
})

it('should render one portal and restore the previous target on replacement or removal', () => {
  const first = document.createElement('button')
  const second = document.createElement('button')
  first.setAttribute('aria-describedby', 'existing-description')
  document.body.append(first, second)
  const [target, setTarget] = createSignal<HTMLElement | undefined>(first)
  const result = render(() => <PTooltip target={target()} show text="설명" />)
  const tooltip = screen.getByRole('tooltip')
  expect(result.container.contains(tooltip)).toBe(false)
  expect(document.querySelectorAll('[data-pomo-tooltip-content]')).toHaveLength(1)
  expect(first.getAttribute('aria-describedby')).toContain('existing-description')
  setTarget(second)
  expect(first).toHaveAttribute('aria-describedby', 'existing-description')
  expect(first).not.toHaveAttribute('data-pomo-tooltip-trigger')
  expect(second).toHaveAttribute('aria-describedby', tooltip.id)
  setTarget(undefined)
  expect(second).not.toHaveAttribute('aria-describedby')
  expect(screen.queryByRole('tooltip')).toBeNull()
  result.unmount()
  expect(document.querySelector('[data-pomo-tooltip-content]')).toBeNull()
  first.remove()
  second.remove()
})

it('should not dismiss the active tooltip when an older request is hidden', () => {
  const [first, setFirst] = createSignal<HTMLElement>()
  const [second, setSecond] = createSignal<HTMLElement>()
  const [firstShow, setFirstShow] = createSignal(true)
  const [secondShow, setSecondShow] = createSignal(false)
  render(() => (
    <>
      <button ref={setFirst}>첫째</button>
      <button ref={setSecond}>둘째</button>
      <PTooltip target={first()} show={firstShow()} text="첫 번째" />
      <PTooltip target={second()} show={secondShow()} text="두 번째" />
    </>
  ))
  expect(screen.getByRole('tooltip')).toHaveTextContent('첫 번째')
  setSecondShow(true)
  setFirstShow(false)
  vi.advanceTimersByTime(200)
  expect(screen.getByRole('tooltip')).toHaveTextContent('두 번째')
  expect(first()).not.toHaveAttribute('aria-describedby')
  expect(second()).toHaveAttribute('aria-describedby', screen.getByRole('tooltip').id)
})

it.each([true, false])('should require nonblank text with browser support %s', (supported) => {
  vi.stubGlobal('CSS', {supports: () => supported})
  const [target, setTarget] = createSignal<HTMLElement>()
  const [text, setText] = createSignal<string>()
  render(() => (
    <>
      <button ref={setTarget}>대상</button>
      <PTooltip target={target()} show text={text()} />
    </>
  ))
  const button = screen.getByRole('button')
  expect(screen.queryByRole('tooltip')).toBeNull()
  expect(button).not.toHaveAttribute('title')
  setText('내용')
  if (supported) {
    expect(screen.getByRole('tooltip')).toHaveTextContent('내용')
  } else {
    expect(button).toHaveAttribute('title', '내용')
  }
  setText('  \n  ')
  expect(screen.queryByRole('tooltip')).toBeNull()
  expect(button).not.toHaveAttribute('title')
  expect(button).not.toHaveAttribute('aria-describedby')
  setText('다시 표시')
  if (supported) {
    expect(screen.getByRole('tooltip')).toHaveTextContent('다시 표시')
  } else {
    expect(button).toHaveAttribute('title', '다시 표시')
  }
  setText('')
  expect(screen.queryByRole('tooltip')).toBeNull()
  expect(button).not.toHaveAttribute('title')
})

it('should not reopen a dismissed tooltip when nonblank text changes', () => {
  const [target, setTarget] = createSignal<HTMLElement>()
  const [text, setText] = createSignal('내용')
  render(() => (
    <>
      <button ref={setTarget}>대상</button>
      <PTooltip target={target()} show text={text()} />
    </>
  ))
  fireEvent.keyDown(document, {key: 'Escape'})
  setText('변경된 내용')
  expect(screen.queryByRole('tooltip')).toBeNull()
})

it('should render no tooltip DOM when only the provider is assembled', () => {
  const [target, setTarget] = createSignal<HTMLElement>()
  baseRender(() => (
    <PTooltipProvider>
      <button ref={setTarget}>대상</button>
      <PTooltip target={target()} show text="설명" />
    </PTooltipProvider>
  ))
  expect(document.querySelector('[data-pomo-tooltip-content]')).toBeNull()
  expect(screen.getByRole('button')).not.toHaveAttribute('aria-describedby')
})

it('should render nothing when content has no provider', () => {
  baseRender(() => <PTooltipContent />)
  expect(document.querySelector('[data-pomo-tooltip-content]')).toBeNull()
})

it('should respect controlled visibility in the native title fallback', () => {
  vi.stubGlobal('CSS', {supports: () => false})
  const [target, setTarget] = createSignal<HTMLElement>()
  const [show, setShow] = createSignal(false)
  render(() => (
    <>
      <button ref={setTarget}>대상</button>
      <PTooltip target={target()} show={show()} text="설명" />
    </>
  ))
  const button = screen.getByRole('button')
  expect(button).not.toHaveAttribute('title')
  setShow(true)
  expect(button).toHaveAttribute('title', '설명')
  setShow(false)
  expect(button).not.toHaveAttribute('title')
})

it.each(['escape', 'scroll', 'click'] as const)(
  'should reopen on hover while focus remains after dismissal by %s',
  (dismissal) => {
    const result = renderTooltip()
    const button = result.getByRole('button')
    button.focus()
    fireEvent.pointerEnter(button)
    vi.advanceTimersByTime(400)
    expect(button).toHaveAttribute('aria-describedby')
    switch (dismissal) {
      case 'escape':
        fireEvent.keyDown(document, {key: 'Escape'})
        break
      case 'scroll':
        fireEvent.scroll(document)
        break
      case 'click':
        fireEvent.click(button)
        break
    }
    expect(button).not.toHaveAttribute('aria-describedby')
    fireEvent.pointerLeave(button)
    fireEvent.pointerEnter(button)
    vi.advanceTimersByTime(400)
    expect(button).toHaveAttribute('aria-describedby', screen.getByRole('tooltip').id)
  },
)

it.each([
  {side: 'bottom', top: 76},
  {side: 'top', top: 10},
])('should point the arrow toward the trigger from $side', ({side, top}) => {
  const bounds = vi
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(function bounds(this: HTMLElement) {
      return this.getAttribute('role') === 'tooltip'
        ? new DOMRect(80, top, 60, 30)
        : new DOMRect(90, 48, 44, 20)
    })
  try {
    const result = renderTooltip()
    fireEvent.pointerEnter(result.getByRole('button'))
    vi.advanceTimersByTime(400)
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toHaveAttribute('data-side', side)
    expect(tooltip.style.getPropertyValue('--pomo-tooltip-arrow-x')).toBe('32px')
    expect(tooltip.querySelector('[data-pomo-tooltip-arrow]')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
  } finally {
    bounds.mockRestore()
  }
})
