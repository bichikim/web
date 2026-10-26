/** @vitest-environment jsdom */
import {afterEach, expect, test, vi} from 'vitest'
import {createPlayer} from '../create-player'
import {prepareDocument, puppetDocument} from './fixtures/document'

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
afterEach(() => vi.clearAllMocks())
const source = {
  ...puppetDocument,
  motions: [],
  parameters: [{defaultValue: 0, id: 'p', maximum: 10, minimum: 0, name: 'P'}],
}

test('should apply the replacement document and parameters in one rendered frame', async () => {
  const player = await createPlayer({
    canvas: document.createElement('canvas'),
    document: prepareDocument(source),
  })
  const initial = renderer.applyFrame.mock.calls.length
  const next = prepareDocument({
    ...source,
    parameters: source.parameters.map((parameter) => ({...parameter, maximum: 5})),
  })
  expect(player.updateDocument(next, {p: 10})).toBe(true)
  expect(renderer.applyFrame).toHaveBeenCalledTimes(initial + 1)
  expect(player.getParameterValue('p')).toBe(5)
  expect(player.updateDocument(next)).toBe(true)
  expect(player.getParameterValue('p')).toBe(5)
  player.destroy()
})

test('should retain parameters and rendered state when the replacement is rejected', async () => {
  const player = await createPlayer({
    canvas: document.createElement('canvas'),
    document: prepareDocument(source),
    parameterValues: {p: 2},
  })
  const initial = renderer.applyFrame.mock.calls.length
  renderer.updateDocument.mockReturnValueOnce(false)
  expect(player.updateDocument(prepareDocument(source), {p: 8})).toBe(false)
  expect(renderer.applyFrame).toHaveBeenCalledTimes(initial)
  expect(player.getParameterValue('p')).toBe(2)
  player.destroy()
})
