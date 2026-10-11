import {afterEach, describe, expect, test} from 'vitest'
import {
  createEmptyDocument,
  createPlayer,
  parseDocument,
  type Player,
  type PuppetDocument,
  serializeDocument,
} from '../../src/player'

const players: Array<Player> = []
const source: PuppetDocument = {
  ...createEmptyDocument(),
  motions: [
    {
      duration: 1,
      id: 'fade',
      tracks: [
        {
          keyframes: [
            {time: 0, value: 0},
            {time: 1, value: 1},
          ],
          kind: 'parameter',
          parameterId: 'opacity',
        },
      ],
    },
    {
      duration: 1,
      id: 'hold',
      tracks: [{keyframes: [{time: 0, value: 1}], kind: 'parameter', parameterId: 'opacity'}],
    },
  ],
  parameterBindings: [
    {
      id: 'opacity-binding',
      keyforms: [
        {
          parts: [
            {partId: 'part', properties: {opacity: 0}, vertices: [0, 0, 64, 0, 64, 64, 0, 64]},
          ],
          values: [0],
        },
        {
          parts: [
            {partId: 'part', properties: {opacity: 1}, vertices: [0, 0, 64, 0, 64, 64, 0, 64]},
          ],
          values: [1],
        },
      ],
      parameterIds: ['opacity'],
      targetPartIds: ['part'],
    },
  ],
  parameters: [{defaultValue: 1, id: 'opacity', maximum: 1, minimum: 0, name: 'Opacity'}],
  parts: [
    {
      id: 'part',
      mesh: {
        indices: [0, 1, 2, 0, 2, 3],
        uvs: [0, 0, 1, 0, 1, 1, 0, 1],
        vertices: [0, 0, 64, 0, 64, 64, 0, 64],
      },
      texture: {
        height: 64,
        src: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#ff0000"/></svg>')}`,
        width: 64,
      },
    },
  ],
  scene: undefined,
  viewport: {height: 64, width: 64},
}
const setup = async () => {
  const parsed = parseDocument(serializeDocument(source))
  if (!parsed.ok) {
    throw new Error('Invalid playback fixture')
  }
  const canvas = document.createElement('canvas')
  const player = await createPlayer({canvas, document: parsed.document, resolution: 1})
  players.push(player)
  player.stop()
  const copy = document.createElement('canvas')
  copy.width = 64
  copy.height = 64
  const context = copy.getContext('2d')!
  const alpha = () => {
    player.redraw()
    context.clearRect(0, 0, 64, 64)
    context.drawImage(canvas, 0, 0)
    return context.getImageData(32, 32, 1, 1).data[3]!
  }
  return {alpha, player}
}
afterEach(() => players.splice(0).forEach((player) => player.destroy()))

describe('createPlayer runtime playback', () => {
  test('should render weighted simultaneous animations and release direct parameter overrides', async () => {
    const {alpha, player} = await setup()
    const fade = player.startMotion('fade', {weight: 0.5})!
    const hold = player.startMotion('hold', {weight: 0.5})!
    player.pause()
    fade.seek(0)
    expect(player.getParameterValue('opacity')).toBe(0.5)
    expect(Math.abs(alpha() - 128)).toBeLessThanOrEqual(1)
    player.setParameterValue('opacity', 0.25)
    expect(player.getParameterValue('opacity')).toBe(0.25)
    expect(Math.abs(alpha() - 64)).toBeLessThanOrEqual(1)
    player.clearParameterValues(['opacity'])
    expect(Math.abs(alpha() - 128)).toBeLessThanOrEqual(1)
    hold.stop()
    fade.setWeight(1)
    fade.seek(1)
    expect(alpha()).toBe(255)
    fade.stop()
    expect(alpha()).toBe(255)
  })
  test('should advance and finish independent one-shot playback on the real Pixi ticker', async () => {
    const {alpha, player} = await setup()
    let complete = () => {}
    const completed = new Promise<void>((resolve) => {
      complete = resolve
    })
    const handle = player.startMotion('fade', {loop: false, onComplete: complete, speed: 10})!
    handle.seek(0.9)
    await completed
    expect(handle.getState()).toMatchObject({status: 'finished', time: 1})
    expect(player.getParameterValue('opacity')).toBe(1)
    expect(alpha()).toBe(255)
  })
})
