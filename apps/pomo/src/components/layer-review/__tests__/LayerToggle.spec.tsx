/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {describe, expect, it, vi} from 'vitest'

import {LayerToggle} from '../LayerToggle'

describe('LayerToggle', () => {
  it('should expose a labeled Kobalte checkbox and forward its next state', () => {
    const onChange = vi.fn()
    render(() => (
      <LayerToggle
        checked
        description="분리된 얼굴과 머리카락"
        label="머리 레이어"
        onChange={onChange}
      />
    ))
    const checkbox = screen.getByRole('checkbox', {name: /머리 레이어/})

    expect(checkbox).toBeChecked()
    fireEvent.click(checkbox)

    expect(onChange).toHaveBeenCalledWith(false)
  })
})
