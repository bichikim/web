/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {expect, it} from 'vitest'

import {PScribbleCircleControl} from '../CircleControl'

it('should omit the scribble circle when disabled', () => {
  const result = render(() => (
    <PScribbleCircleControl enabled={false}>
      <button type="button">제어</button>
    </PScribbleCircleControl>
  ))

  expect(result.container.querySelector('svg')).toBeNull()
})

it('should draw a circular scribble that follows the control size when enabled', () => {
  const result = render(() => (
    <PScribbleCircleControl enabled>
      <button type="button">제어</button>
    </PScribbleCircleControl>
  ))
  const wrapper = result.container.firstElementChild
  const frame = wrapper?.lastElementChild
  const paths = frame?.querySelectorAll('path')

  expect(wrapper?.lastElementChild).toBe(frame)
  expect(frame).toHaveClass('h-full', 'w-full')
  expect(frame?.getAttribute('preserveAspectRatio')).toBe('none')
  expect(paths).toHaveLength(2)
  expect(paths?.[0]?.getAttribute('stroke-width')).toBe('6')
  expect(paths?.[1]?.getAttribute('stroke-width')).toBe('3')
})
