import {cleanup, render} from '@solidjs/testing-library'
import {createSignal, For} from 'solid-js'
import {afterEach, expect, it} from 'vitest'
import type {ChatTone} from '../../src/features/codex'
import {SSpeechFrame} from '../../src/components/SSpeechFrame'
import 'virtual:uno.css'

afterEach(cleanup)
const tones: readonly ChatTone[] = ['blue', 'teal', 'violet', 'rose', 'amber', 'sky']

it('should keep white bodies while coloring the outline, cel shadow and emphasis marks per chat', async () => {
  const {container} = render(() => (
    <div class="grid gap-8 p-9">
      <For each={tones}>
        {(tone) => (
          <div class="wallpaper-speech relative h-30 w-60">
            <SSpeechFrame tone={tone} target={{x: 500, y: 100}} />
          </div>
        )}
      </For>
    </div>
  ))
  await expect.poll(() => container.querySelectorAll('svg path[data-speech-body]').length).toBe(6)
  const frames = Array.from(container.querySelectorAll('svg'))
  const inks = frames.map(
    (svg) => getComputedStyle(svg.querySelector('[data-speech-outline]')!).stroke,
  )
  expect(new Set(inks).size).toBe(6)
  for (const svg of frames) {
    const outline = svg.querySelector('[data-speech-outline]')!
    expect(getComputedStyle(outline).fill).toBe('rgb(255, 255, 255)')
    expect(getComputedStyle(svg.querySelector('[data-speech-shadow]')!).fill).not.toBe('none')
    expect(svg.querySelectorAll('[data-speech-emphasis] path')).toHaveLength(2)
    expect(getComputedStyle(svg).overflow).toBe('visible')
  }
})

it.each(['top', 'right', 'bottom', 'left'] as const)(
  'should draw a connected %s tail outside the body without making it interactive',
  async (edge) => {
    const [target, setTarget] = createSignal({x: 0, y: 0})
    const {container} = render(() => (
      <div class="wallpaper-speech relative h-40 w-60 m-12">
        <SSpeechFrame target={target()} />
      </div>
    ))
    const frame = container.firstElementChild!.firstElementChild!
    const bounds = frame.getBoundingClientRect()
    const targets = {
      bottom: {x: bounds.x + bounds.width / 2, y: bounds.bottom + 100},
      right: {x: bounds.right + 100, y: bounds.y + bounds.height / 2},
      left: {x: bounds.x - 100, y: bounds.y + bounds.height / 2},
      top: {x: bounds.x + bounds.width / 2, y: bounds.y - 100},
    }
    setTarget(targets[edge])
    await expect.poll(() => frame.querySelector('svg')?.getAttribute('data-edge')).toBe(edge)
    const outline = frame.querySelector('[data-speech-outline]')!
    const body = frame.querySelector('[data-speech-body]')!
    expect(outline.getAttribute('d')).not.toBe(body.getAttribute('d'))
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!
    const sample = {
      bottom: [bounds.width / 2, bounds.height + 6],
      right: [bounds.width + 6, bounds.height / 2],
      left: [-6, bounds.height / 2],
      top: [bounds.width / 2, -6],
    }[edge]!
    expect(
      context.isPointInPath(new Path2D(outline.getAttribute('d')!), sample[0]!, sample[1]!),
    ).toBe(true)
    expect(context.isPointInPath(new Path2D(body.getAttribute('d')!), sample[0]!, sample[1]!)).toBe(
      false,
    )
    expect(getComputedStyle(outline).pointerEvents).toBe('none')
  },
)
