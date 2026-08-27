/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {describe, expect, it, vi} from 'vitest'
import {HButton} from '../HButton'

describe('HButton', () => {
  it('should compose button behavior and presentation props', async () => {
    const onClick = vi.fn()
    const view = render(() => (
      <HButton class="custom" onClick={onClick}>
        Run
      </HButton>
    ))
    const button = view.getByRole('button', {name: 'Run'})

    await fireEvent.click(button)

    expect(onClick).toHaveBeenCalledOnce()
    expect(button.className).toContain('custom')
  })

  it('should render configured anchor semantics', () => {
    const view = render(() => (
      <HButton href="/details" type="anchor">
        Details
      </HButton>
    ))

    expect(view.getByRole('link', {name: 'Details'}).getAttribute('href')).toBe('/details')
  })
})
