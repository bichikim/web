import {expect, test, vi} from 'vitest'
import {prepareDocument, puppetDocument} from './fixtures/document'
import {createPlayer} from '../create-player'

const renderer = vi.hoisted(() => ({
  applyFrame: vi.fn(),
  destroy: vi.fn(),
  redraw: vi.fn(),
  resize: vi.fn(),
  setRunning: vi.fn(),
  subscribeFrame: vi.fn(),
  updateDocument: vi.fn(() => true),
}))
vi.mock('../rendering/create-player-renderer', () => ({
  createPlayerRenderer: vi.fn(async () => renderer),
}))

test('should recompute imported motion frames without accumulating their fade again', async () => {
  const document = prepareDocument({
    ...puppetDocument,
    motionParameterBase: 'previous-frame',
    motions: [
      {
        duration: 2,
        fadeInTime: 0.5,
        id: 'idle',
        tracks: [{keyframes: [{time: 0, value: 10}], kind: 'parameter', parameterId: 'p'}],
      },
    ],
    parameters: [{defaultValue: 0, id: 'p', maximum: 10, minimum: 0, name: 'P'}],
  })
  const player = await createPlayer({canvas: globalThis.document.createElement('canvas'), document})
  player.stop()
  player.play()
  const tick = renderer.subscribeFrame.mock.calls[0]![0] as (delta: number) => void
  tick(0.25)
  expect(player.getParameterValue('p')).toBeCloseTo(5)
  player.setParameterValues({p: 9})
  expect(player.getParameterValue('p')).toBe(9)
  player.clearParameterValues()
  expect(player.getParameterValue('p')).toBeCloseTo(5)
  tick(0.125)
  expect(player.getParameterValue('p')).toBeCloseTo(5 + 5 * (0.5 - 0.5 * Math.cos(Math.PI * 0.75)))
  player.destroy()
})
