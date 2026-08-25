/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {expect, it} from 'vitest'

import {PScribbleCircleControl} from '../scribble/CircleControl'

it('should omit the scribble circle when disabled', () => {
  const result = render(() => (
    <PScribbleCircleControl enabled={false}>
      <button type="button">제어</button>
    </PScribbleCircleControl>
  ))

  expect(result.container.querySelector('.pomo-scribble-circle-border')).toBeNull()
})

it('should draw a circular scribble that follows the control size when enabled', () => {
  const result = render(() => (
    <PScribbleCircleControl enabled>
      <button type="button">제어</button>
    </PScribbleCircleControl>
  ))
  const wrapper = result.container.querySelector('.pomo-scribble-circle-control')
  const frame = result.container.querySelector<SVGElement>('.pomo-scribble-circle-border')
  const paths = frame?.querySelectorAll('path')

  expect(wrapper?.lastElementChild).toBe(frame)
  expect(frame?.classList.contains('h-full')).toBe(true)
  expect(frame?.classList.contains('w-full')).toBe(true)
  expect(frame?.getAttribute('preserveAspectRatio')).toBe('none')
  expect(paths).toHaveLength(2)
  expect(paths?.[0]?.getAttribute('stroke-width')).toBe('6')
  expect(paths?.[1]?.getAttribute('stroke-width')).toBe('3')
})
