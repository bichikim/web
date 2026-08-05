/**
 * @vitest-environment jsdom
 */

import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {CheckboxBody} from '../CheckboxBody'
import {CheckboxProvider} from '../CheckboxProvider'

describe('CheckboxBody', () => {
  afterEach(() => {
    cleanup()
  })

  it('should expose checkbox semantics and toggle with the Space key', async () => {
    const onChange = vi.fn()
    const onKeyDown = vi.fn()
    const {getByRole} = render(() => (
      <CheckboxProvider onChange={onChange}>
        <CheckboxBody component="div" onKeyDown={onKeyDown}>
          Receive updates
        </CheckboxBody>
      </CheckboxProvider>
    ))
    const checkbox = getByRole('checkbox', {name: 'Receive updates'})

    expect(checkbox.getAttribute('aria-checked')).toBe('false')
    expect(checkbox.getAttribute('tabindex')).toBe('0')

    await fireEvent.keyDown(checkbox, {key: ' '})

    expect(onKeyDown).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith(true)
    expect(checkbox.getAttribute('aria-checked')).toBe('true')
  })
})
