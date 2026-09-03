/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {PSwitch} from '../PSwitch'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('PSwitch', () => {
  it('should render descriptive content and emit a checked change', () => {
    const onChange = vi.fn()
    const [checked, setChecked] = createSignal(false)
    const result = render(() => (
      <PSwitch
        checked={checked()}
        class="extra-switch"
        description="집중하는 동안 화면을 켜 둬요."
        label="화면 자동 꺼짐 방지"
        onChange={onChange}
      />
    ))
    const input = screen.getByRole('switch', {name: '화면 자동 꺼짐 방지'})
    const control = input.nextElementSibling

    expect(result.container.firstElementChild).toHaveClass('extra-switch')
    expect(screen.getByText('집중하는 동안 화면을 켜 둬요.')).toBeInTheDocument()
    expect(input).not.toBeChecked()
    expect(control).toHaveClass('bg-switch-track')
    expect(control?.firstElementChild).toHaveClass('bg-switch-thumb')

    fireEvent.click(input)
    expect(onChange).toHaveBeenCalledWith(true)

    setChecked(true)
    expect(input).toBeChecked()
  })

  it('should omit a description and block changes while disabled', () => {
    const onChange = vi.fn()
    const result = render(() => <PSwitch checked disabled label="알림음" onChange={onChange} />)
    const input = screen.getByRole('switch', {name: '알림음'})
    const label = screen.getByText('알림음')
    const control = input.nextElementSibling

    expect(input).toBeChecked()
    expect(input).toBeDisabled()
    expect(label).toHaveClass('cursor-not-allowed')
    expect(control).toHaveClass('cursor-not-allowed')
    expect(result.container).toHaveTextContent(/^알림음$/u)

    fireEvent.click(input)
    expect(onChange).not.toHaveBeenCalled()
  })
})
