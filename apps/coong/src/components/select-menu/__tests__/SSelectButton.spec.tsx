/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {describe, expect, it} from 'vitest'
import {SSelectButton} from '../SSelectButton'

describe('SSelectButton', () => {
  it('should render a standalone styled select button', () => {
    render(() => <SSelectButton class="custom-button">Standalone</SSelectButton>)

    expect(screen.getByRole('button', {name: 'Standalone'})).toHaveClass('custom-button')
  })
})
