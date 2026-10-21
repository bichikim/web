import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {SPoffoWidgetRow} from '../../src/components/SPoffoWidgetRow'
import 'virtual:uno.css'

afterEach(cleanup)
it('should animate folding, retain editor values and expose the whole header as a toggle', async () => {
  const [expanded, setExpanded] = createSignal(true)
  render(() => (
    <ul class="m-0 w-120 list-none p-0">
      <SPoffoWidgetRow
        widget={{assetId: 'character', id: 'widget', tracking: 'cursor', x: null, y: null}}
        number={1}
        name="눈꽃.json"
        selected
        expanded={expanded()}
        onSelect={() => setExpanded((value) => !value)}
        onClose={vi.fn()}
      >
        <div class="h-50">
          <input aria-label="편집 중인 값" value="유지할 설정" />
        </div>
      </SPoffoWidgetRow>
    </ul>
  ))
  const header = screen.getByRole('button', {name: '위젯 1 설정'})
  const panel = screen.getByRole('region', {name: '위젯 1 설정 내용'})
  const input = screen.getByRole('textbox', {name: '편집 중인 값'})
  const headerBounds = header.getBoundingClientRect()
  for (const x of [
    headerBounds.left + 8,
    headerBounds.left + headerBounds.width / 2,
    headerBounds.right - 8,
  ]) {
    expect(
      header.contains(document.elementFromPoint(x, headerBounds.top + headerBounds.height / 2)),
    ).toBe(true)
  }
  const height = panel.getBoundingClientRect().height
  fireEvent.click(header)
  expect(header).toHaveAttribute('aria-expanded', 'false')
  expect(panel.inert).toBe(true)
  expect(document.activeElement).toBe(header)
  await expect.poll(() => panel.getAnimations().length).toBeGreaterThan(0)
  const animation = panel.getAnimations()[0]!
  animation.pause()
  animation.currentTime = 100
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
  const middle = panel.getBoundingClientRect().height
  expect(middle).toBeGreaterThan(0)
  expect(middle).toBeLessThan(height)
  animation.finish()
  await expect.poll(() => panel.getBoundingClientRect().height).toBeLessThan(1)
  expect(input.isConnected).toBe(true)
  expect(screen.queryByRole('textbox', {name: '편집 중인 값'})).not.toBeInTheDocument()
  fireEvent.click(header)
  await expect.poll(() => panel.getBoundingClientRect().height).toBeCloseTo(height, 0)
  expect(screen.getByRole('textbox', {name: '편집 중인 값'})).toBe(input)
  expect(input).toHaveValue('유지할 설정')
})
