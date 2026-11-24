import {afterEach, expect, test} from 'vitest'
import {
  configurePlayerBuffering,
  createEmptyDocument,
  createPlayer,
  flushPlayerInputs,
  getPlayerBufferingInfo,
  parseDocument,
  type Player,
  type PuppetDocument,
  type PuppetSceneNode,
  serializeDocument,
} from '../../src/player'

const players: Player[] = []
const source: PuppetDocument = {
  ...createEmptyDocument(),
  expressions: [
    {
      fadeInTime: 0,
      fadeOutTime: 0,
      id: 'held',
      parameters: [{blend: 'add', parameterId: 'x', value: 0.2}],
    },
    {
      fadeInTime: 0,
      fadeOutTime: 0,
      id: 'press',
      parameters: [{blend: 'add', parameterId: 'y', value: 0.4}],
    },
  ],
  motions: [
    {
      duration: 1,
      id: 'hold',
      loop: true,
      tracks: [
        {
          keyframes: [
            {time: 0, value: 0},
            {time: 1, value: 1},
          ],
          kind: 'parameter',
          parameterId: 'x',
        },
      ],
    },
  ],
  parameters: ['x', 'y'].map((id) => ({defaultValue: 0, id, maximum: 1, minimum: 0, name: id})),
}
const setup = async (fixture: PuppetDocument = source) => {
  const parsed = parseDocument(serializeDocument(fixture))
  if (!parsed.ok) {
    throw new Error('Invalid Rust playback fixture')
  }
  let rendered = () => {}
  const first = new Promise<void>((resolve) => {
    rendered = resolve
  })
  const player = await createPlayer({
    buffering: true,
    canvas: document.createElement('canvas'),
    document: parsed.document,
    onFrame: rendered,
    randomSeed: 42,
    renderer: 'pixi-webgl',
    workerRuntime: 'rust',
  })
  players.push(player)
  await first
  return player
}
afterEach(() => players.splice(0).forEach((player) => player.destroy()))

test('should load deep groups and preserve special parameter IDs through the real Worker', async () => {
  const leaf: PuppetSceneNode = {
    children: [],
    id: 'leaf',
    kind: 'group',
    locked: false,
    name: 'Leaf',
    visible: true,
  }
  const root = Array.from({length: 120}, (_, index) => index).reduce<PuppetSceneNode>(
    (child, index) => ({
      children: [child],
      id: `g${index}`,
      kind: 'group',
      locked: false,
      name: `Group ${index}`,
      visible: true,
    }),
    leaf,
  )
  const player = await setup({
    ...createEmptyDocument(),
    parameters: ['__poffoArray', '__poffoUndefined'].map((id) => ({
      defaultValue: 0,
      id,
      maximum: 1,
      minimum: 0,
      name: id,
    })),
    scene: {roots: [root]},
  })
  player.pause()
  player.setParameterValues({__poffoArray: 0.25, __poffoUndefined: 0.75})
  await flushPlayerInputs(player)
  expect(getPlayerBufferingInfo(player)).toMatchObject({enabled: true, workerRuntime: 'rust'})
  expect(player.getParameterValues()).toEqual({__poffoArray: 0.25, __poffoUndefined: 0.75})
})

test('should load the real Rust Worker and apply current expression controls', async () => {
  const player = await setup()
  expect(getPlayerBufferingInfo(player)).toMatchObject({enabled: true, workerRuntime: 'rust'})
  player.pause()
  player.seek(0)
  player.setExpressions(['held', 'press'])
  await expect(flushPlayerInputs(player)).resolves.toBe('applied')
  expect(player.getParameterValues()).toEqual({x: 0.2, y: 0.4})
  player.setExpressions(['held'])
  await flushPlayerInputs(player)
  expect(player.getParameterValues()).toEqual({x: 0.2, y: 0})
})

test('should preserve Rust playback time through seek, pause, resume and disable', async () => {
  const player = await setup()
  expect(player.playMotion('hold', {loop: true})).toBe(true)
  await flushPlayerInputs(player)
  expect(getPlayerBufferingInfo(player)).toMatchObject({
    framesAhead: 3,
    status: 'active',
    workerRuntime: 'rust',
  })
  player.pause()
  player.seek(0.25)
  await flushPlayerInputs(player)
  expect(player.getParameterValue('x')).toBeCloseTo(0.25)
  player.resume()
  await flushPlayerInputs(player)
  expect(getPlayerBufferingInfo(player).status).toBe('active')
  player.pause()
  player.seek(0.5)
  await flushPlayerInputs(player)
  await configurePlayerBuffering(player, {enabled: false})
  expect(player.getParameterValue('x')).toBeCloseTo(0.5)
  expect(getPlayerBufferingInfo(player).workerRuntime).toBeUndefined()
})

test('should retain expression layers and overrides across renderer replacement', async () => {
  const player = await setup()
  player.pause()
  player.seek(0)
  player.setExpressionLayer('face', 'held')
  await flushPlayerInputs(player)
  expect(player.getParameterValue('x')).toBeCloseTo(0.2)
  await expect(
    player.configureRenderer({
      antialiasing: 'ssaa',
      canvas: document.createElement('canvas'),
      renderer: 'pixi-webgl',
    }),
  ).resolves.toBe('applied')
  player.setExpressionLayer('face', undefined)
  player.setParameterValue('y', 0.65)
  await flushPlayerInputs(player)
  expect(player.getParameterValue('x')).toBeCloseTo(0)
  expect(player.getParameterValue('y')).toBeCloseTo(0.65)
  expect(getPlayerBufferingInfo(player)).toMatchObject({status: 'idle', workerRuntime: 'rust'})
})
