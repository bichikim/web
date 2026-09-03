/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it} from 'vitest'

import {POrbitBorder} from '../POrbitBorder'

it('should render its content inside the shared orbit border effect', () => {
  const {container} = render(() => (
    <POrbitBorder class="custom-orbit">
      <button type="button">새 소식</button>
    </POrbitBorder>
  ))

  const root = container.querySelector('[data-orbit-border]')
  const effect = container.querySelector('[data-orbit-border-effect]')

  expect(root).toHaveClass('custom-orbit', 'relative', 'overflow-visible')
  expect(effect).toHaveClass(
    'animate-orbit-border',
    '-inset-0.5',
    'motion-reduce:animate-none',
    'pomo-orbit-border',
  )
  expect(effect).toHaveAttribute('aria-hidden', 'true')
  expect(effect).toBeEmptyDOMElement()
  expect(screen.getByRole('button', {name: '새 소식'})).toBeInTheDocument()
})
