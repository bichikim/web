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

    expect(container.querySelector('[data-part="top"]')).toHaveClass('backdrop-blur-[8px]')
    expect(container.querySelector('[data-part="top"]')).toHaveStyle({height: '52px'})
    expect(container.querySelector('[data-part="left"]')).toHaveStyle({
      height: '64px',
      top: '52px',
      width: '32px',
    })
    expect(container.querySelector('[data-part="right"]')).toHaveStyle({
      height: '64px',
      left: '168px',
      top: '52px',
    })
    expect(container.querySelector('[data-part="bottom"]')).toHaveStyle({top: '116px'})
    expect(container.querySelectorAll('[data-corner]')).toHaveLength(4)
    expect(container.querySelector('[data-corner="top-left"]')).toHaveStyle({
      height: '32px',
      left: '32px',
      top: '52px',
      width: '32px',
    })
    expect(container.querySelector('[data-corner="top-left"]')).toHaveStyle({
      maskImage: 'radial-gradient(circle at 100% 100%, transparent 32px, black 32px)',
    })
    expect(container.querySelector('[data-part="highlight"]')).not.toBeInTheDocument()
  })

  it('should cover the viewport when target bounds are absent', () => {
    const {container} = render(() => <PTourMask targetBounds={null} />)

    expect(container.querySelector('[data-part="full"]')).toBeInTheDocument()
    expect(container.querySelector('[data-part="highlight"]')).not.toBeInTheDocument()
  })
})
