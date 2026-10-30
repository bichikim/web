import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, test} from 'vitest'
import {SCodexSpeechStack} from '../../src/components/SCodexSpeechStack'
import {readSpeechMask} from '../../src/features/speech/read-speech-mask'
import type {HitMask} from '../../src/features/hit-test'
import 'virtual:uno.css'

afterEach(cleanup)

const hit = (mask: HitMask, x: number, y: number) => {
  const column = Math.floor((x / innerWidth) * mask.width)
  const row = Math.floor((y / innerHeight) * mask.height)
  return mask.runs.some(([line, start, end]) => row === line && column >= start && column < end)
}
const paint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
const mount = () => {
  render(() => (
    <main class="w-[272px] p-12">
      <SCodexSpeechStack
        activities={['A', 'B', 'C'].map((sessionId) => ({
          notificationId: 1,
          phase: 'response',
          receivedAt: 1,
          response: '긴 응답\n'.repeat(80),
          sessionId,
          text: '응답',
          title: sessionId,
          tool: null,
        }))}
      />
    </main>
  ))
  return screen.getByRole('main')
}

test('should retain headers and controls while transparent margins and rounded corners pass through', async () => {
  const root = mount()
  const canvas = document.createElement('canvas')
  await expect
    .poll(() => screen.getByRole('list').getBoundingClientRect().height)
    .toBeGreaterThan(400)
  await expect
    .poll(() =>
      Array.from(root.querySelectorAll('svg[data-edge], aside > div > svg')).every(
        (svg) =>
          Math.abs(
            Number(svg.getAttribute('viewBox')?.split(' ')[3]) - svg.getBoundingClientRect().height,
          ) < 1,
      ),
    )
    .toBe(true)
  const mask = readSpeechMask({canvas, element: root})
  expect(hit(mask, 12, 100)).toBe(false)
  for (const card of screen.getAllByRole('listitem')) {
    const rect = card.querySelector('aside > [aria-hidden="true"]')!.getBoundingClientRect()
    expect(hit(mask, rect.x + rect.width / 2, rect.y + 16)).toBe(true)
    expect(hit(mask, rect.x - 5, rect.y + 20)).toBe(false)
  }
  const top = screen
    .getAllByRole('listitem')
    .map((card) => card.querySelector('aside > [aria-hidden="true"]')!.getBoundingClientRect())
    .toSorted((a, b) => a.y - b.y)[0]!
  expect(hit(mask, top.x + 1, top.y + 1)).toBe(false)
  const input = screen.getAllByRole('textbox').at(-1)!.getBoundingClientRect()
  expect(hit(mask, input.x + 15, input.y + 15)).toBe(true)
})

test('should match browser hit testing for clipped bodies and update from actual animation frames', async () => {
  const root = mount()
  const canvas = document.createElement('canvas')
  const check = () => {
    const mask = readSpeechMask({canvas, element: root})
    const list = screen.getByRole('list').getBoundingClientRect()
    // The 512px mask uses majority alpha; browser hit testing can include a partially covered edge pixel.
    for (let row = 0; row < mask.height; row += 5) {
      const y = ((row + 0.5) / mask.height) * innerHeight
      for (const x of [
        list.left - 8,
        list.left + 8,
        list.left + list.width / 2,
        list.right - 8,
        list.right + 8,
      ]) {
        const column = Math.floor((x / innerWidth) * mask.width)
        const sample = ((column + 0.5) / mask.width) * innerWidth
        const actual =
          document.elementFromPoint(sample, y)?.closest('aside') !== null &&
          document.elementFromPoint(sample, y)?.closest('aside') !== undefined
        const sampled = hit(mask, sample, y)
        if (sampled !== actual) {
          const horizontal = innerWidth / mask.width
          const vertical = innerHeight / mask.height
          const adjacent = [
            hit(mask, sample - horizontal, y),
            hit(mask, sample + horizontal, y),
            hit(mask, sample, y - vertical),
            hit(mask, sample, y + vertical),
            hit(mask, sample - horizontal, y - vertical),
            hit(mask, sample - horizontal, y + vertical),
            hit(mask, sample + horizontal, y - vertical),
            hit(mask, sample + horizontal, y + vertical),
          ]
          // Permit only the single raster cell straddling a boundary, never an interior mismatch.
          expect(adjacent, `boundary ${sample},${y}`).toContain(actual)
          expect(adjacent, `boundary ${sample},${y}`).toContain(sampled)
        }
      }
    }
  }
  await expect
    .poll(() => screen.getByRole('list').getBoundingClientRect().height)
    .toBeGreaterThan(400)
  await expect
    .poll(() =>
      Array.from(root.querySelectorAll('aside > div > svg')).every(
        (svg) =>
          Math.abs(
            Number(svg.getAttribute('viewBox')?.split(' ')[3]) - svg.getBoundingClientRect().height,
          ) < 1,
      ),
    )
    .toBe(true)
  check()
  const outgoing = screen
    .getAllByRole('listitem')
    .find((card) => card.getAttribute('aria-posinset') === '1')!
  screen.getByRole('button', {name: '채팅 C 선택'}).click()
  const selected = screen
    .getAllByRole('listitem')
    .find((card) => card.getAttribute('aria-posinset') === '3')!
  const animation = selected.getAnimations()[0]
  animation.pause()
  animation.currentTime = 100
  await paint()
  check()
  animation.finish()
  await expect.poll(() => selected.getAttribute('aria-posinset')).toBe('1')
  const motions = document.getAnimations()
  motions.forEach((motion) => motion.pause())
  await Promise.all(motions.map((motion) => motion.ready))
  const departure = outgoing.getAnimations()[0]
  departure.pause()
  departure.currentTime = Number(departure.effect!.getTiming().duration) * 0.3
  // Native hit testing must observe the painted paused frame, after animation readiness.
  await paint()
  check()
  cleanup()
  expect(readSpeechMask({canvas, element: root}).runs).toEqual([])
})
