/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import {cleanup, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import type {SpeechAnchor} from '../../features/speech'
import {SSpeechFrame} from '../SSpeechFrame'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should remeasure the tail when the stack changes attachment without resizing its body', () => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function readBounds(this: Element) {
      return new DOMRect(0, this.getAttribute('data-anchor') === 'top' ? 300 : 100, 240, 100)
    },
  )
  const [anchor, setAnchor] = createSignal<SpeechAnchor>('bottom')
  const {container} = render(() => <SSpeechFrame anchor={anchor()} target={{x: 280, y: 220}} />)
  expect(container.querySelector('svg')).toHaveAttribute('data-edge', 'bottom')
  expect(container.querySelector('svg')).toHaveAttribute('data-corner', 'bottom-right')
  expect(container.querySelectorAll('svg path')).toHaveLength(1)
  expect(container.querySelector('path')?.getAttribute('d')?.match(/Q/g)).toHaveLength(3)
  setAnchor('top')
  expect(container.querySelector('svg')).toHaveAttribute('data-edge', 'top')
  expect(container.querySelector('svg')).toHaveAttribute('data-corner', 'top-right')
})
