/** @vitest-environment jsdom */
import {render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it} from 'vitest'
import {PScribbleFrame, type ScribbleFramePaths} from '../Frame'

it('should update paths and restore defaults without replacing the frame', () => {
  const [paths, setPaths] = createSignal<ScribbleFramePaths>()
  const [className, setClassName] = createSignal('original-frame')
  render(() => (
    <section aria-label="테두리">
      <PScribbleFrame class={className()} paths={paths()} />
    </section>
  ))
  const section = screen.getByRole('region', {name: '테두리'})
  const frame = section.querySelector('svg')!
  const nodes = [...frame.querySelectorAll('path')]
  const defaults = nodes.map((path) => path.getAttribute('d'))

  setPaths({accent: 'M 2 2 L 8 8', border: 'M 0 0 L 10 10'})
  setClassName('updated-frame')
  expect(section.querySelector('svg')).toBe(frame)
  frame.querySelectorAll('path').forEach((path, index) => expect(path).toBe(nodes[index]))
  expect(nodes.map((path) => path.getAttribute('d'))).toEqual(['M 0 0 L 10 10', 'M 2 2 L 8 8'])
  expect(frame).toHaveClass('updated-frame')
  expect(frame).not.toHaveClass('original-frame')

  setPaths(undefined)
  expect(nodes.map((path) => path.getAttribute('d'))).toEqual(defaults)
  expect(section.querySelector('svg')).toBe(frame)
  expect(frame).toHaveAttribute('aria-hidden', 'true')
  expect(frame).toHaveAttribute('preserveAspectRatio', 'none')
  expect(nodes.map((path) => path.getAttribute('vector-effect'))).toEqual([
    'non-scaling-stroke',
    'non-scaling-stroke',
  ])
})
