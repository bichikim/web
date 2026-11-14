import {afterEach, expect, test, vi} from 'vitest'
import {
  configurePlayerBuffering,
  createEmptyDocument,
  createPlayer,
  flushPlayerInputs,
  getPlayerBufferingInfo,
  parseDocument,
  type Player,
  type PuppetDocument,
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
  parameters: ['x', 'y'].map((id) => ({defaultValue: 0, id, maximum: 1, minimum: 0, name: id})),
}
const setup = async () => {
  const parsed = parseDocument(serializeDocument(source))
  if (!parsed.ok) {
    throw new Error('Invalid buffered playback fixture')
  }
  const player = await createPlayer({
    buffering: true,
    canvas: document.createElement('canvas'),
    document: parsed.document,
    randomSeed: 42,
    renderer: 'webgl',
    resolution: 1,
  })
  players.push(player)
  return player
}
afterEach(() => {
  players.splice(0).forEach((player) => player.destroy())
  vi.unstubAllGlobals()
})

test('should retain synchronous paused controls when animation callbacks become unavailable', async () => {
  const parsed = parseDocument(serializeDocument(source))
  if (!parsed.ok) {
    throw new Error('Invalid fallback fixture')
  }
  const player = await createPlayer({
    canvas: document.createElement('canvas'),
    document: parsed.document,
    renderer: 'webgl',
  })
  players.push(player)
  player.pause()
  const nextFrame = requestAnimationFrame
  vi.stubGlobal('requestAnimationFrame', undefined)
  await configurePlayerBuffering(player, {enabled: true})
  expect(getPlayerBufferingInfo(player).status).toBe('unsupported')
  player.setParameterValue('x', 0.3)
  const applied = player.getParameterValue('x')
  vi.stubGlobal('requestAnimationFrame', nextFrame)
  expect(applied).toBe(0.3)
})

test('should not repeatedly announce unsupported buffering while native playback advances', async () => {
  const parsed = parseDocument(
    serializeDocument({...source, motions: [{duration: 1, id: 'hold', tracks: []}]}),
  )
  if (!parsed.ok) {
    throw new Error('Invalid native playback fixture')
  }
  const changed = vi.fn()
  const player = await createPlayer({
    canvas: document.createElement('canvas'),
    document: parsed.document,
    onBufferingChange: changed,
    renderer: 'webgl',
  })
  players.push(player)
  vi.stubGlobal('Worker', undefined)
  await configurePlayerBuffering(player, {enabled: true})
  expect(changed).toHaveBeenCalledOnce()
  for (const _frame of [0, 1, 2]) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  }
  expect(getPlayerBufferingInfo(player).status).toBe('unsupported')
  expect(changed).toHaveBeenCalledOnce()
})

test('should present an empty initial Worker frame without waiting for a control change', async () => {
  const parsed = parseDocument(serializeDocument(createEmptyDocument()))
  if (!parsed.ok) {
    throw new Error('Invalid empty document')
  }
  let present = () => {}
  const presented = new Promise<void>((resolve) => {
    present = resolve
  })
  const player = await createPlayer({
    buffering: true,
    canvas: document.createElement('canvas'),
    document: parsed.document,
    onFrame: present,
    renderer: 'webgl',
  })
  players.push(player)
  await presented
  expect(getPlayerBufferingInfo(player).status).toBe('idle')
})

test('should apply and release multiple expressions in a real Worker and retain them when disabled', async () => {
  const player = await setup()
  expect(player.setExpressions(['held', 'press'])).toBe(true)
  await expect(flushPlayerInputs(player)).resolves.toBe('applied')
  expect(getPlayerBufferingInfo(player).status).toBe('idle')
  expect(player.getParameterValues()).toEqual({x: 0.2, y: 0.4})
  player.setExpressions(['held'])
  await flushPlayerInputs(player)
  expect(player.getParameterValues()).toEqual({x: 0.2, y: 0})
  await configurePlayerBuffering(player, {enabled: false})
  expect(player.getParameterValues()).toEqual({x: 0.2, y: 0})
})

test('should retain independent expression layers across Worker checkpoints and renderer replacement', async () => {
  const player = await setup()
  player.setExpressionLayer('face', 'held')
  player.setExpressionLayer('hand', 'press')
  await flushPlayerInputs(player)
  expect(player.getParameterValues()).toEqual({x: 0.2, y: 0.4})
  await expect(
    player.configureRenderer({
      antialiasing: 'ssaa',
      canvas: document.createElement('canvas'),
      renderer: 'webgl',
    }),
  ).resolves.toBe('applied')
  player.setExpressionLayer('hand')
  await flushPlayerInputs(player)
  expect(player.getParameterValues()).toEqual({x: 0.2, y: 0})
})

test('should apply and release parameter blends at both stages through the Worker input boundary', async () => {
  const player = await setup()
  player.patchParameterBlends({x: {mode: 'overwrite', value: 0.3}})
  player.patchParameterBlends({y: {mode: 'overwrite', value: 0.7}}, 'after-physics')
  await flushPlayerInputs(player)
  expect(player.getParameterValues()).toEqual({x: 0.3, y: 0.7})
  player.patchParameterBlends({x: undefined})
  player.patchParameterBlends({y: undefined}, 'after-physics')
  await flushPlayerInputs(player)
  expect(player.getParameterValues()).toEqual({x: 0, y: 0})
})
