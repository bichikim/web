/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {describe, expect, it} from 'vitest'

import {SToastProvider} from '../SToastProvider'

describe('SToastProvider', () => {
  it('should preserve application children inside the toast provider', () => {
    render(() => <SToastProvider>application</SToastProvider>)

    expect(screen.getByText('application')).toBeInTheDocument()
  })
})
