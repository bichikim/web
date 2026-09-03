/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'

const radioGroupMock = vi.hoisted(() => ({
  onChange: undefined as ((value: string) => void) | undefined,
}))

vi.mock('@kobalte/core/radio-group', () => {
  interface RootProps {
    readonly children: JSX.Element
    readonly class?: string
    readonly onChange: (value: string) => void
    readonly onKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent>
    readonly value: string
  }

  const Root = (props: RootProps) => {
    radioGroupMock.onChange = props.onChange
    return (
      <div
        class={props.class}
        data-selected-value={props.value}
        data-testid="radio-group"
        onKeyDown={props.onKeyDown}
      >
        {props.children}
      </div>
    )
  }
  const Label = (props: {readonly children: JSX.Element}) => <span>{props.children}</span>
  const Item = (props: {
    readonly children: JSX.Element
    readonly class?: string
    readonly disabled?: boolean
    readonly value: string
  }) => (
    <div
      class={props.class}
      data-disabled={props.disabled ? '' : undefined}
      data-radio-value={props.value}
    >
      {props.children}
    </div>
  )
  const ItemInput = (props: {readonly 'aria-label': string; readonly disabled?: boolean}) => (
    <input
      aria-label={props['aria-label']}
      disabled={props.disabled}
      onClick={(event) => {
        const value =
          event.currentTarget.closest<HTMLElement>('[data-radio-value]')?.dataset.radioValue
        radioGroupMock.onChange?.(value ?? '')
      }}
      type="radio"
    />
  )
  const ItemControl = (props: {readonly children: JSX.Element; readonly class: string}) => (
    <div class={props.class}>{props.children}</div>
  )
  const ItemIndicator = (props: {readonly children: JSX.Element; readonly class: string}) => (
    <span class={props.class}>{props.children}</span>
  )

  return {
    RadioGroup: Object.assign(Root, {Item, ItemControl, ItemIndicator, ItemInput, Label}),
  }
})

import {PRadioSwitch} from '../PRadioSwitch'

const OPTIONS = [
  {icon: 'i-tabler-sun', label: '낮', value: 'day'},
  {icon: 'i-tabler-moon', label: '밤', value: 'night'},
  {label: '자동', value: 'auto'},
] as const

describe('PRadioSwitch', () => {
  it('should render options, scene-style icons, and selected values', () => {
    render(() => (
      <PRadioSwitch
        class="extra-layout"
        label="시간"
        onChange={vi.fn()}
        options={OPTIONS}
        sceneStyle="scribble"
        value="day"
      />
    ))

    expect(screen.getByText('시간')).toBeInTheDocument()
    expect(screen.getByTestId('radio-group')).toHaveClass('extra-layout')
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByRole('radio', {name: '낮'}).parentElement?.parentElement).toHaveClass(
      'bg-surface-overlay',
    )
    expect(screen.getByRole('radio', {name: '낮'}).parentElement).toHaveClass('flex-1')
    expect(screen.getByText('자동')).toHaveClass('[word-break:keep-all]')
    expect(screen.getByText('자동').parentElement).toHaveClass('px-2')
    expect(screen.getByText('낮').previousElementSibling).toHaveClass('i-pomo-scribble:sun')
    expect(screen.getAllByText('낮').at(-1)?.nextElementSibling?.firstElementChild).toHaveClass(
      'i-pomo-scribble:check',
    )
    expect(screen.getByText('자동').previousElementSibling).toBeNull()
  })

  it('should emit known choices and ignore values outside its options', () => {
    const onChange = vi.fn()
    render(() => <PRadioSwitch label="시간" onChange={onChange} options={OPTIONS} value="day" />)

    fireEvent.click(screen.getByRole('radio', {name: '밤'}))
    expect(onChange).toHaveBeenCalledWith('night')
    expect(screen.getByRole('radio', {name: '밤'}).parentElement).toHaveClass('flex-1')

    radioGroupMock.onChange?.('unsupported')
    expect(onChange).toHaveBeenCalledOnce()
  })

  it('should disable every option when interaction is unavailable', () => {
    render(() => (
      <PRadioSwitch disabled label="시간" onChange={vi.fn()} options={OPTIONS} value="day" />
    ))

    expect(screen.getAllByRole('radio')).toHaveLength(3)
    for (const input of screen.getAllByRole('radio')) {
      expect(input).toBeDisabled()
    }
  })

  it('should disable and ignore an unavailable individual option', () => {
    const onChange = vi.fn()
    const options = [OPTIONS[0], {...OPTIONS[1], disabled: true}, OPTIONS[2]]
    render(() => <PRadioSwitch label="시간" onChange={onChange} options={options} value="day" />)

    expect(screen.getByRole('radio', {name: '밤'})).toBeDisabled()
    radioGroupMock.onChange?.('night')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('should move focus and selection for every supported arrow navigation key', () => {
    const onChange = vi.fn()
    render(() => <PRadioSwitch label="시간" onChange={onChange} options={OPTIONS} value="day" />)

    const [day, night, automatic] = screen.getAllByRole('radio')
    fireEvent.keyDown(day, {key: 'ArrowRight'})
    expect(night).toHaveFocus()
    fireEvent.keyDown(night, {key: 'ArrowDown'})
    expect(automatic).toHaveFocus()
    fireEvent.keyDown(automatic, {key: 'ArrowLeft'})
    expect(night).toHaveFocus()
    fireEvent.keyDown(night, {key: 'ArrowUp'})
    expect(day).toHaveFocus()
    fireEvent.keyDown(day, {key: 'End'})
    expect(automatic).toHaveFocus()
    fireEvent.keyDown(automatic, {key: 'Home'})
    expect(day).toHaveFocus()
    expect(onChange).toHaveBeenNthCalledWith(1, 'night')
    expect(onChange).toHaveBeenNthCalledWith(2, 'auto')
    expect(onChange).toHaveBeenNthCalledWith(3, 'night')
    expect(onChange).toHaveBeenNthCalledWith(4, 'day')
    expect(onChange).toHaveBeenNthCalledWith(5, 'auto')
    expect(onChange).toHaveBeenNthCalledWith(6, 'day')
  })

  it('should ignore unrelated keys and targets without enabled radio inputs', () => {
    const onChange = vi.fn()
    render(() => <PRadioSwitch label="시간" onChange={onChange} options={OPTIONS} value="day" />)

    const group = screen.getByTestId('radio-group')
    const [day, ...remainingInputs] =
      group.querySelectorAll<HTMLInputElement>('input[type="radio"]')
    if (day === undefined) {
      throw new Error('라디오 입력을 찾을 수 없어요.')
    }
    fireEvent.keyDown(day, {key: 'Enter'})
    fireEvent.keyDown(group, {key: 'ArrowRight'})
    for (const input of [day, ...remainingInputs]) {
      input.disabled = true
    }
    fireEvent.keyDown(day, {key: 'ArrowRight'})

    expect(onChange).not.toHaveBeenCalled()
  })
})
