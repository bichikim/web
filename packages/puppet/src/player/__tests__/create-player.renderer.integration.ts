/** @vitest-environment jsdom */
import {afterEach, expect, test, vi} from 'vitest'
import {createPlayer} from '../create-player'
import {createEmptyDocument} from '../create-empty-document'
import {markPreparedPuppetDocument} from '../internal/prepared-document'
import {createPlayerRenderer, type PlayerRenderer} from '../rendering/create-player-renderer'
import type {PlayerFrame} from '../player-types'

vi.mock('../rendering/create-player-renderer', () => ({createPlayerRenderer: vi.fn()}))
afterEach(() => vi.resetAllMocks())

const resource = (): PlayerRenderer => ({
  applyFrame: vi.fn(),
  destroy: vi.fn(),
  getPaintOrder: vi.fn(() => []),
  getPartVertices: vi.fn(),
  getRenderingInfo: vi.fn(() => ({antialiasing: 'ssaa' as const, renderer: 'webgl' as const})),
  redraw: vi.fn(),
  resize: vi.fn(),
  setRunning: vi.fn(),
  setViewCamera: vi.fn(),
  subscribeFrame: vi.fn(),
  toDocumentPoint: vi.fn((point) => point),
  updateDocument: vi.fn(() => true),
})

test('should retain the complete simulation across GPU renderer replacement', async () => {
  const before = resource()
  const control = resource()
  const after = resource()
  vi.mocked(createPlayerRenderer)
    .mockResolvedValueOnce(before)
    .mockResolvedValueOnce(control)
    .mockResolvedValueOnce(after)
  const model = markPreparedPuppetDocument({
    ...createEmptyDocument(),
    motionParameterBase: 'previous-frame',
    motions: [
      {
        duration: 2,
        fadeInTime: 0.5,
        id: 'walk',
        tracks: [
          {
            keyframes: [
              {time: 0, value: -10},
              {time: 2, value: 20},
            ],
            kind: 'parameter',
            parameterId: 'input',
          },
        ],
      },
    ],
    parameters: [
      {defaultValue: 0, id: 'input', maximum: 30, minimum: -30, name: 'Input'},
      {defaultValue: 0, id: 'output', maximum: 30, minimum: -30, name: 'Output'},
    ],
    physics: {
      pendulums: [
        {
          damping: 1.2,
          gravity: 9.8,
          id: 'swing',
          inputParameterId: 'input',
          inputScale: 1,
          length: 1,
          outputParameterId: 'output',
          outputScale: 1,
        },
      ],
    },
  })
  const frames: PlayerFrame[] = []
  const expectedFrames: PlayerFrame[] = []
  const player = await createPlayer({
    canvas: document.createElement('canvas'),
    document: model,
    motionId: 'walk',
    onFrame: (frame) => frames.push(frame),
  })
  const reference = await createPlayer({
    canvas: document.createElement('canvas'),
    document: model,
    motionId: 'walk',
    onFrame: (frame) => expectedFrames.push(frame),
  })
  const tick = vi.mocked(before.subscribeFrame).mock.calls[0]![0]
  const controlTick = vi.mocked(control.subscribeFrame).mock.calls[0]![0]
  for (let index = 0; index < 12; index += 1) {
    tick(1 / 30)
    controlTick(1 / 30)
  }
  const parameters = player.getParameterValues()
  const count = frames.length
  await expect(
    player.configureRenderer({
      antialiasing: 'ssaa',
      canvas: document.createElement('canvas'),
      renderer: 'webgpu',
    }),
  ).resolves.toBe('applied')
  expect(frames).toHaveLength(count)
  expect(player.getParameterValues()).toEqual(parameters)
  const nextTick = vi.mocked(after.subscribeFrame).mock.calls[0]![0]
  for (let index = 0; index < 18; index += 1) {
    nextTick(1 / 30)
    controlTick(1 / 30)
    expect(player.getParameterValues()).toEqual(reference.getParameterValues())
  }
  expect(frames).toEqual(expectedFrames)
  expect(before.destroy).toHaveBeenCalledOnce()
  player.destroy()
  reference.destroy()
})
