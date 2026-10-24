/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import type {PuppetParameterValues} from '../../../../deformation'
import type {PuppetParameterBinding2D} from '../../../../player/document'
import {EditorKeyformGrid} from '../EditorKeyformGrid'

const parameters = [
  {defaultValue: 0, id: 'x', maximum: 30, minimum: -30, name: 'X'},
  {defaultValue: 0, id: 'y', maximum: 30, minimum: -30, name: 'Y'},
]
const hosts: HTMLElement[] = []
const setup = (shadow: boolean, accept = true, afterMove?: () => void) => {
  const host = document.createElement('div')
  hosts.push(host)
  document.body.append(host)
  const root = shadow ? host.attachShadow({mode: 'open'}) : document
  const container = document.createElement('div')
  if (shadow) {
    root.appendChild(container)
  } else {
    host.append(container)
  }
  const [binding, setBinding] = createSignal<PuppetParameterBinding2D>({
    id: 'binding',
    keyforms: [{parts: [], values: [-20, 12]}],
    parameterIds: ['x', 'y'],
  })
  const onMove = vi.fn((_id: string, _from: PuppetParameterValues, to: PuppetParameterValues) => {
    if (accept) {
      setBinding({...binding(), keyforms: [{parts: [], values: [to[0]!, to[1]!]}]})
    }
    afterMove?.()
  })
  render(
    () => (
      <EditorKeyformGrid
        binding={binding()}
        parameters={parameters}
        values={[-20, 12]}
        onKeyformMove={onMove}
      />
    ),
    {container},
  )
  const view = within(container)
  const marker = view.getByRole('button', {name: '키폼 선택: -20, 12'})
  marker.focus()
  return {marker, onMove, root, view}
}
afterEach(() => {
  cleanup()
  for (const host of hosts.splice(0)) {
    host.remove()
  }
})

test.each([false, true])(
  'should retain focus for consecutive keyboard moves with shadow=%s',
  async (shadow) => {
    const {marker, onMove, root, view} = setup(shadow)
    fireEvent.keyDown(marker, {key: 'ArrowRight'})
    await Promise.resolve()
    const moved = view.getByRole('button', {name: '키폼 선택: -19.5, 12'})
    expect(root.activeElement).toBe(moved)
    fireEvent.keyDown(moved, {key: 'ArrowRight'})
    await Promise.resolve()
    expect(root.activeElement).toBe(view.getByRole('button', {name: '키폼 선택: -19, 12'}))
    expect(onMove).toHaveBeenCalledTimes(2)
  },
)

test.each([false, true])(
  'should retain the original focus for a rejected move with shadow=%s',
  async (shadow) => {
    const {marker, root} = setup(shadow, false)
    fireEvent.keyDown(marker, {key: 'ArrowRight'})
    await Promise.resolve()
    expect(root.activeElement).toBe(marker)
  },
)

test.each([false, true])(
  'should not steal focus moved to another control with shadow=%s',
  async (shadow) => {
    const outside = document.createElement('button')
    document.body.append(outside)
    try {
      const {marker} = setup(shadow, true, () => outside.focus())
      fireEvent.keyDown(marker, {key: 'ArrowRight'})
      await Promise.resolve()
      expect(document.activeElement).toBe(outside)
    } finally {
      outside.remove()
    }
  },
)
