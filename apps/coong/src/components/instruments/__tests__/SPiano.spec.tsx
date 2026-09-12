/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {describe, expect, it} from 'vitest'
import {SPiano} from '../SPiano'

describe('SPiano', () => {
  it('should render the complete styled piano keyboard', () => {
    render(() => <SPiano data-testid="piano" showKeyName />)

    expect(screen.getByTestId('piano')).toBeInTheDocument()
    expect(screen.getAllByRole('button').length).toBeGreaterThan(100)
  })
})
