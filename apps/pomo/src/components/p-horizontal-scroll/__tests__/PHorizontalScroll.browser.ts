import '@unocss/reset/tailwind.css'
import {cleanup, render} from '@solidjs/testing-library'
import {createComponent} from 'solid-js'
import {afterEach, beforeEach, expect, it} from 'vitest'
import {commands, page, server, userEvent} from 'vitest/browser'
import {PHorizontalScroll} from '../PHorizontalScroll'

declare module 'vitest/browser' {
  interface BrowserCommands {
    getUtilityStyles: (content: string) => Promise<string>
    nativeHorizontalWheel: (delta: number) => Promise<void>
  }
}

let stylesheet: HTMLStyleElement
let root: HTMLDivElement
let outside: HTMLInputElement
let content: HTMLDivElement
let events: Array<{type: string; trusted: boolean; key?: string}>
const MAXIMUM_FOCUS_TABS = 8
const INTERIOR_WHEEL_DELTA = 400
const EDGE_WHEEL_DELTA = 5000
const MAXIMUM_WHEEL_STEPS = 4
const observe = (event: Event) => {
  events.push({
    key: event instanceof KeyboardEvent ? event.key : undefined,
    trusted: event.isTrusted,
    type: event.type,
  })
  if (event instanceof KeyboardEvent && event.key === '1') {
    content.className = 'w-40 h-20'
  }
}

beforeEach(() => {
  stylesheet = document.createElement('style')
  document.head.append(stylesheet)
  outside = document.createElement('input')
  outside.setAttribute('aria-label', 'Outside')
  root = document.createElement('div')
  root.className = 'w-80'
  content = document.createElement('div')
  content.className = 'w-240 h-20'
  content.textContent = 'Overflowing cards'
  events = []
  document.body.append(outside, root)
  document.addEventListener('keydown', observe, true)
  document.addEventListener('wheel', observe, true)
})

afterEach(() => {
  document.removeEventListener('keydown', observe, true)
  document.removeEventListener('wheel', observe, true)
  cleanup()
  outside.remove()
  root.remove()
  stylesheet.remove()
})

const mountCards = async () => {
  render(
    () =>
      createComponent(PHorizontalScroll, {
        accessibleLabel: 'Cards',
        children: content,
        leftLabel: 'Previous',
        rightLabel: 'Next',
      }),
    {container: root},
  )
  stylesheet.textContent = await commands.getUtilityStyles(`${document.body.outerHTML} w-40`)
  const region = page.getByRole('region', {exact: true, name: 'Cards'})
  const viewport = region.element() as HTMLElement
  await expect.poll(() => viewport.scrollWidth > viewport.clientWidth).toBe(true)
  await expect.poll(() => root.querySelector('button[aria-label="Next"]') !== null).toBe(true)
  stylesheet.textContent = await commands.getUtilityStyles(`${document.body.outerHTML} w-40`)
  await expect.element(page.getByRole('button', {exact: true, name: 'Next'})).toBeVisible()
  return {region, viewport}
}

const tabTo = async (element: HTMLElement) => {
  await page.getByRole('textbox', {exact: true, name: 'Outside'}).click()
  const advanceTab = async (remaining: number): Promise<void> => {
    if (document.activeElement === element || remaining === 0) {
      return
    }
    await userEvent.keyboard(server.browser === 'webkit' ? '{Alt>}{Tab}{/Alt}' : '{Tab}')
    await advanceTab(remaining - 1)
  }
  await advanceTab(MAXIMUM_FOCUS_TABS)
  expect(document.activeElement).toBe(element)
  expect(
    events.some((event) => event.type === 'keydown' && event.key === 'Tab' && event.trusted),
  ).toBe(true)
}

const wheelUntilRemoved = async (
  viewport: HTMLElement,
  edge: Element,
  delta: number,
  remaining = MAXIMUM_WHEEL_STEPS,
): Promise<void> => {
  if (!edge.isConnected || remaining === 0) {
    return
  }
  const before = viewport.scrollLeft
  await commands.nativeHorizontalWheel(delta)
  await expect.poll(() => !edge.isConnected || viewport.scrollLeft !== before).toBe(true)
  await wheelUntilRemoved(viewport, edge, delta, remaining - 1)
}

it.each(['Next', 'Previous'])(
  'should retain keyboard focus after native wheel removes %s',
  async (label) => {
    const {region, viewport} = await mountCards()
    if (label === 'Previous') {
      await region.hover()
      await commands.nativeHorizontalWheel(INTERIOR_WHEEL_DELTA)
      await expect.poll(() => viewport.scrollLeft > 1).toBe(true)
      await expect
        .poll(() => root.querySelector('button[aria-label="Previous"]') !== null)
        .toBe(true)
      stylesheet.textContent = await commands.getUtilityStyles(`${document.body.outerHTML} w-40`)
      await expect.element(page.getByRole('button', {exact: true, name: label})).toBeVisible()
    }
    const edge = page.getByRole('button', {exact: true, name: label}).element() as HTMLElement
    await tabTo(edge)
    await region.hover()
    await wheelUntilRemoved(viewport, edge, label === 'Next' ? EDGE_WHEEL_DELTA : -EDGE_WHEEL_DELTA)

    await expect.poll(() => edge.isConnected).toBe(false)
    expect(document.activeElement).toBe(viewport)
    expect(events.some((event) => event.type === 'wheel' && event.trusted)).toBe(true)
  },
)

it('should preserve outside focus when native wheel removes an edge', async () => {
  const {region, viewport} = await mountCards()
  const edge = page.getByRole('button', {exact: true, name: 'Next'}).element()
  await page.getByRole('textbox', {exact: true, name: 'Outside'}).click()
  await region.hover()
  await wheelUntilRemoved(viewport, edge, EDGE_WHEEL_DELTA)

  await expect.poll(() => edge.isConnected).toBe(false)
  expect(document.activeElement).toBe(outside)
})

it('should retain keyboard focus when content resizing removes overflow', async () => {
  const {viewport} = await mountCards()
  const edge = page.getByRole('button', {exact: true, name: 'Next'}).element() as HTMLElement
  await tabTo(edge)
  await userEvent.keyboard('1')

  await expect.poll(() => edge.isConnected).toBe(false)
  expect(document.activeElement).toBe(viewport)
  expect(viewport.scrollLeft).toBe(0)
})
