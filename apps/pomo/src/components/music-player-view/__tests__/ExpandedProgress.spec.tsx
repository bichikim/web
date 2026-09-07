/** @vitest-environment jsdom */

import {cleanup, render} from '@solidjs/testing-library'
import {afterEach, expect, it} from 'vitest'
import {ExpandedPlayerProgress} from '../ExpandedProgress'

afterEach(cleanup)

it('should use the shared tooltip surface for the native pointer-time preview', () => {
  const {container} = render(() => <ExpandedPlayerProgress expanded />)
  const preview = container.querySelector('media-time-range [slot="preview"]')
  expect(preview).toHaveClass('bg-modal-surface', 'px-1.5', 'py-1')
  expect(preview).toHaveClass('[--pomo-color-modal-surface-opacity:100%]')
  expect(preview?.querySelector('media-preview-time-display')).not.toBeNull()
})
