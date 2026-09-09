/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {describe, expect, it} from 'vitest'

import {PTourMask} from '../PTourMask'

const BOUNDS = {
  bottom: 116,
  height: 64,
  left: 32,
  right: 168,
  top: 52,
  viewportHeight: 768,
  viewportWidth: 1024,
  width: 136,
} as const

describe('PTourMask', () => {
  it('should leave a control-rounded target area uncovered without a highlight border', () => {
    const {container} = render(() => <PTourMask targetBounds={BOUNDS} />)
    const maskElement = container.querySelector<HTMLElement>('[data-part="mask"]')

    expect(maskElement).toHaveClass('backdrop-blur-[8px]', 'pomo-tour-mask')
    expect(maskElement?.style.getPropertyValue('--target-bottom')).toBe('116px')
    expect(maskElement?.style.getPropertyValue('--target-height')).toBe('64px')
    expect(maskElement?.style.getPropertyValue('--target-left')).toBe('32px')
    expect(maskElement?.style.getPropertyValue('--target-right')).toBe('168px')
    expect(maskElement?.style.getPropertyValue('--target-top')).toBe('52px')
    expect(maskElement?.style.getPropertyValue('--target-width')).toBe('136px')
    expect(container.querySelectorAll('[data-part="mask"]')).toHaveLength(1)
    expect(container.querySelector('[data-part="top"]')).not.toBeInTheDocument()
    expect(container.querySelector('[data-part="left"]')).not.toBeInTheDocument()
    expect(container.querySelectorAll('[data-corner]')).toHaveLength(0)
    expect(container.querySelector('[data-part="highlight"]')).not.toBeInTheDocument()
  })

  it('should cover the viewport when target bounds are absent', () => {
    const {container} = render(() => <PTourMask targetBounds={null} />)

    expect(container.querySelector('[data-part="full"]')).toBeInTheDocument()
    expect(container.querySelector('[data-part="highlight"]')).not.toBeInTheDocument()
  })
})
