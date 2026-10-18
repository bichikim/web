import {Texture} from 'pixi.js'
import {expect, it, vi} from 'vitest'
import {PixiLayerScene, type PixiLayerSceneDefinition} from '../layer-scene'
import {acquireTextureGroup, releaseTextureGroup} from '../texture-leases'

vi.mock('../texture-leases', () => ({acquireTextureGroup: vi.fn(), releaseTextureGroup: vi.fn()}))

const TEXTURE_SIZE = 16
const MISMATCHED_MASK_WIDTH = 8
const FAILED_INITIALIZATION_COUNT = 3

const createTexture = (width: number, height: number) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (context === null) {
    throw new Error('마스크 검증용 캔버스를 만들 수 없습니다.')
  }
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  return Texture.from(canvas)
}

it('should release filter subscriptions on a shared texture after repeated failed initialization', async () => {
  const textures = new Map([
    ['/layer.png', createTexture(TEXTURE_SIZE, TEXTURE_SIZE)],
    ['/bad-mask.png', createTexture(MISMATCHED_MASK_WIDTH, TEXTURE_SIZE)],
    ['/good-mask.png', createTexture(TEXTURE_SIZE, TEXTURE_SIZE)],
  ])
  const mask = textures.get('/good-mask.png')!
  const listeners = () => ({
    source: mask.source.listenerCount('change'),
    style: mask.source.style.listenerCount('change'),
  })
  const before = listeners()
  const effect = {
    distance: {x: 1, y: 1},
    kind: 'masked-pixel-push',
    maskSource: '/good-mask.png',
  } as const
  const definition: PixiLayerSceneDefinition = {
    background: '#000',
    height: 16,
    id: 'shared-mask-cleanup',
    layers: [
      {
        id: 'layer',
        maskSource: '/bad-mask.png',
        motion: {
          effects: [effect],
          kind: 'pixel-oscillation',
          travel: {maximumSeconds: 1, minimumSeconds: 1},
        },
        source: '/layer.png',
        statePixelPush: {channel: 'state', effect},
      },
    ],
    width: 16,
  }
  vi.mocked(acquireTextureGroup).mockImplementation(async (sources) =>
    sources.map((source) => ({release: vi.fn(), source, texture: textures.get(source)!})),
  )
  try {
    const initializeFailure = async () => {
      const scene = new PixiLayerScene(definition, {onRender: vi.fn()})
      await expect(scene.initialize({animationEnabled: false})).rejects.toThrow(
        'Layer mask dimensions must match the layer',
      )
      scene.destroy()
    }
    await Array.from({length: FAILED_INITIALIZATION_COUNT}).reduce(
      (previous) => previous.then(initializeFailure),
      Promise.resolve(),
    )

    expect(listeners()).toEqual(before)
    expect(releaseTextureGroup).toHaveBeenCalledTimes(FAILED_INITIALIZATION_COUNT)
  } finally {
    for (const texture of textures.values()) {
      texture.destroy(true)
    }
    vi.resetAllMocks()
  }
})
