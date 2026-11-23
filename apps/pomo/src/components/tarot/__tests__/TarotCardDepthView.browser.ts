import {cleanup, render} from '@solidjs/testing-library'
import {createComponent} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {commands} from 'vitest/browser'
import {TAROT_CARDS} from 'src/features/tarot'
import {TarotCardDepthView} from '../TarotCardDepthView'

const renderer = vi.hoisted(() => ({destroy: vi.fn(), render: vi.fn()}))
vi.mock('src/features/tarot-depth', () => ({
  TarotDepthRenderer: class {
    destroy = renderer.destroy
    initialize = async () => true
    render = renderer.render
  },
}))

let stylesheet: HTMLStyleElement | undefined
afterEach(() => {
  cleanup()
  stylesheet?.remove()
})

it('should preserve canvas typography proportions while resizing a depth card', async () => {
  const {container} = render(() =>
    createComponent(TarotCardDepthView, {
      card: {...TAROT_CARDS[0]!, orientation: 'upright'},
      locale: 'en',
    }),
  )
  stylesheet = document.createElement('style')
  stylesheet.textContent = await commands.getUtilityStyles(container.innerHTML)
  document.head.append(stylesheet)
  const card = container.querySelector<HTMLElement>('[role="group"]')!
  const canvas = card.querySelector('canvas')!
  const checkTypography = async (width: number) => {
    card.style.setProperty('width', `${width}px`)
    await expect.poll(() => renderer.render.mock.lastCall?.[0]).toMatchObject({width})
    const typography = getComputedStyle(canvas)
    const fontRatio = 0.05
    const markerRatio = 0.8
    expect(Number.parseFloat(typography.fontSize) / canvas.clientWidth).toBeCloseTo(fontRatio)
    expect(Number.parseFloat(typography.getPropertyValue('--tarot-marker-ratio'))).toBe(markerRatio)
  }
  const minimumCardWidth = 200
  const expandedCardWidth = 300
  await checkTypography(minimumCardWidth)
  await checkTypography(expandedCardWidth)
})
