/** @vitest-environment jsdom */

import {Dialog} from '@kobalte/core/dialog'
import {render, screen} from '@solidjs/testing-library'
import {describe, expect, it} from 'vitest'

import {HTourContent} from '../HTourContent'
import type {TourTargetBounds} from '../types'

const createBounds = (top: number, bottom: number): TourTargetBounds => ({
  bottom,
  height: bottom - top,
  left: 40,
  right: 160,
  top,
  viewportHeight: 600,
  viewportWidth: 800,
  width: 120,
})

describe('HTourContent', () => {
  it('should place content below the target when more space is available below', () => {
    render(() => (
      <Dialog open>
        <HTourContent targetBounds={createBounds(60, 108)}>Content</HTourContent>
      </Dialog>
    ))

    const content = screen.getByRole('dialog')

    expect(content).toHaveAttribute('data-placement', 'bottom')
    expect(content).toHaveStyle({
      left: '40px',
      maxHeight: '464px',
      position: 'fixed',
      top: '120px',
    })
  })

  it('should center content when target bounds are unavailable', () => {
    render(() => (
      <Dialog open>
        <HTourContent targetBounds={null}>Content</HTourContent>
      </Dialog>
    ))

    const content = screen.getByRole('dialog')

    expect(content).toHaveAttribute('data-placement', 'center')
    expect(content).toHaveStyle({
      left: '50%',
      position: 'fixed',
      top: '50%',
      transform: 'translate(-50%, -50%)',
    })
  })

  it('should place content above the target when more space is available above', () => {
    render(() => (
      <Dialog open>
        <HTourContent targetBounds={createBounds(500, 548)}>Content</HTourContent>
      </Dialog>
    ))

    const content = screen.getByRole('dialog')

    expect(content).toHaveAttribute('data-placement', 'top')
    expect(content).toHaveStyle({
      bottom: '112px',
      left: '40px',
      maxHeight: '472px',
      position: 'fixed',
    })
  })

  it('should constrain content to the larger side of a centered target', () => {
    render(() => (
      <Dialog open>
        <HTourContent targetBounds={createBounds(276, 324)}>Content</HTourContent>
      </Dialog>
    ))

    expect(screen.getByRole('dialog')).toHaveStyle({maxHeight: '248px', top: '336px'})
  })
})
