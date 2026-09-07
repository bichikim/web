/** @vitest-environment jsdom */

import {Dialog} from '@kobalte/core/dialog'
import {render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

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

class TestResizeObserver {
  static instances: TestResizeObserver[] = []

  readonly disconnect = vi.fn()
  readonly observe = vi.fn()

  constructor(private readonly callback: ResizeObserverCallback) {
    TestResizeObserver.instances.push(this)
  }

  trigger() {
    this.callback([], this as unknown as ResizeObserver)
  }
}

beforeEach(() => {
  TestResizeObserver.instances.length = 0
  vi.stubGlobal('ResizeObserver', TestResizeObserver)
})

afterEach(() => vi.unstubAllGlobals())

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

  it('should keep content within the viewport using its rendered width', () => {
    const bounds = {...createBounds(60, 108), left: 432}

    render(() => (
      <Dialog open>
        <HTourContent targetBounds={bounds}>Content</HTourContent>
      </Dialog>
    ))

    const content = screen.getByRole('dialog')
    content.getBoundingClientRect = () => new DOMRect(432, 120, 704, 200)
    TestResizeObserver.instances[0]?.trigger()

    expect(content).toHaveStyle({left: '80px'})
    expect(80 + content.getBoundingClientRect().width).toBeLessThanOrEqual(784)
  })
})
