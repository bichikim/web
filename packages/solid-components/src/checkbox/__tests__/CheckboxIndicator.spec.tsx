/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {describe, expect, it} from 'vitest'
import {CheckboxBody} from '../CheckboxBody'
import {CheckboxIndicator} from '../CheckboxIndicator'
import {CheckboxProvider} from '../CheckboxProvider'
import {CheckboxToggle} from '../CheckboxToggle'

describe('CheckboxIndicator', () => {
  it('should expose reactive checked and disabled state to indicator children', () => {
    const view = render(() => (
      <CheckboxProvider>
        <CheckboxBody component="button">Toggle</CheckboxBody>
        <CheckboxIndicator component="span" data-testid="indicator" />
        <CheckboxToggle>Selected</CheckboxToggle>
      </CheckboxProvider>
    ))
    const indicator = view.getByTestId('indicator')

    expect(indicator.getAttribute('data-checked')).toBe('false')
    expect(indicator.getAttribute('data-disabled')).toBe('false')
    expect(view.queryByText('Selected')).toBeNull()

    fireEvent.click(view.getByRole('checkbox', {name: 'Toggle'}))

    expect(indicator.getAttribute('data-checked')).toBe('true')
    expect(indicator.getAttribute('data-disabled')).toBe('false')
    expect(view.getByText('Selected')).toBeDefined()
  })

  it('should expose disabled state', () => {
    const view = render(() => (
      <CheckboxProvider disabled>
        <CheckboxIndicator component="span" data-testid="indicator" />
      </CheckboxProvider>
    ))

    expect(view.getByTestId('indicator').getAttribute('data-disabled')).toBe('true')
  })
})
