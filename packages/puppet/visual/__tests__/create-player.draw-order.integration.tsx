import {createIsolatedOrderDocument} from '../../src/player/internal/__tests__/fixtures/isolated-order'
/* eslint-disable no-await-in-loop -- Each input and pixel check depends on the preceding displayed frame. */
import {parseDocumentValue} from '../../src/player/parse-document'
import {afterEach, expect, test} from 'vitest'
import {
  createPlayer,
  flushPlayerInputs,
  getPlayerBufferingInfo,
  type Player,
} from '../../src/player'
import {
  constantOrderChannels,
  createOrderDocument,
  type OrderChannel,
  orderInputs,
} from '../../src/player/internal/__tests__/fixtures/draw-order'

const players: Player[] = []
afterEach(() => {
  players.splice(0).forEach((player) => player.destroy())
  document.body.replaceChildren()
})
const adapter = await navigator.gpu?.requestAdapter()
const gpuTest = test.skipIf(adapter === undefined || adapter === null)

const setup = async (
  runtime: 'javascript' | 'rust',
  channel: OrderChannel,
  target: 'part' | 'group' | 'isolated',
) => {
  const source =
    target === 'isolated'
      ? createIsolatedOrderDocument(channel === 'changing')
      : createOrderDocument(channel, target)
  const parsed = parseDocumentValue(source)
  if (!parsed.ok) {
    throw new Error('Invalid draw-order fixture')
  }
  const host = document.createElement('div')
  Object.defineProperties(host, {clientHeight: {value: 100}, clientWidth: {value: 100}})
  document.body.append(host)
  const canvas = document.createElement('canvas')
  host.append(canvas)
  let ready = () => {}
  let failed = (_reason: Error) => {}
  const first = new Promise<void>((resolve, reject) => {
    ready = resolve
    failed = reject
  })
  const player = await createPlayer({
    buffering: runtime === 'rust',
    canvas,
    document: parsed.document,
    onBufferingChange: (info) => {
      if (info.status === 'active' || info.status === 'idle') {
        ready()
      } else if (info.status === 'error' || info.status === 'unsupported') {
        failed(new Error(`Rust buffering ${info.status}`))
      }
    },
    renderer: 'wgpu',
    resizeTo: host,
    resolution: 1,
    workerRuntime: runtime,
  })
  players.push(player)
  if (runtime === 'rust') {
    await first
    expect(getPlayerBufferingInfo(player).workerRuntime).toBe('rust')
  }
  player.pause()
  expect(player.getRenderingInfo().runtime).toBe('wgpu')
  const pixel = () => {
    const copy = new OffscreenCanvas(100, 100)
    const context = copy.getContext('2d')!
    context.drawImage(canvas, 0, 0)
    return Array.from(context.getImageData(50, 50, 1, 1).data)
  }
  return {pixel, player}
}

gpuTest.each(['javascript', 'rust'] as const)(
  'should retain coincident surfaces at irregular inputs through %s and wgpu',
  async (runtime) => {
    for (const target of ['part', 'group'] as const) {
      for (const channel of constantOrderChannels) {
        const {pixel, player} = await setup(runtime, channel, target)
        for (const values of orderInputs) {
          player.setParameterValues(values)
          expect(await flushPlayerInputs(player)).toBe('applied')
          expect(pixel(), `${runtime}/${target}/${channel}/${JSON.stringify(values)}`).toEqual([
            255, 0, 0, 255,
          ])
        }
        player.destroy()
        players.splice(players.indexOf(player), 1)
      }
    }
  },
)

gpuTest.each(['javascript', 'rust'] as const)(
  'should display real fractional occlusion transitions through %s and wgpu',
  async (runtime) => {
    for (const target of ['part', 'group'] as const) {
      const {pixel, player} = await setup(runtime, 'changing', target)
      for (const [x, color] of [
        [0.4999, [0, 0, 255, 255]],
        [0.5001, [255, 0, 0, 255]],
        [0.4999, [0, 0, 255, 255]],
      ] as const) {
        player.setParameterValues({x, y: 0.17})
        expect(await flushPlayerInputs(player)).toBe('applied')
        expect(pixel()).toEqual(color)
      }
    }
  },
)

gpuTest.each(['javascript', 'rust'] as const)(
  'should isolate group order and apply keyed crossings without an offscreen pass through %s',
  async (runtime) => {
    const still = await setup(runtime, 'rest', 'isolated')
    expect(await flushPlayerInputs(still.player)).toBe('applied')
    expect(still.pixel()).toEqual([0, 0, 255, 255])
    const animated = await setup(runtime, 'changing', 'isolated')
    for (const [x, expected] of [
      [0.4999, [0, 0, 255, 255]],
      [0.5001, [255, 0, 0, 255]],
    ] as const) {
      animated.player.setParameterValues({x, y: 0.17})
      expect(await flushPlayerInputs(animated.player)).toBe('applied')
      expect(animated.pixel()).toEqual(expected)
    }
  },
)
