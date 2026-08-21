import {type Container, type Texture} from 'pixi.js'
import {beforeEach, expect, it, vi} from 'vitest'

vi.mock('../steam-particle-system', () => ({SteamParticleSystem: vi.fn()}))
vi.mock('../texture-leases', () => ({
  acquireTextureGroup: vi.fn(),
  releaseTextureGroup: vi.fn(),
}))

import {PSceneSteamController} from '../scene-steam-controller'
import {SteamParticleSystem} from '../steam-particle-system'
import {acquireTextureGroup, releaseTextureGroup, type TextureLease} from '../texture-leases'

const createLeases = (): readonly TextureLease[] =>
  Array.from({length: 4}, (_, index) => ({
    release: vi.fn(),
    source: `steam-${index}.webp`,
    texture: {index} as unknown as Texture,
  }))

function createSystem() {
  return {
    container: {},
    destroy: vi.fn(),
    setParallaxOffset: vi.fn(),
    setReducedMotion: vi.fn(),
    setVisible: vi.fn(),
    start: vi.fn(),
  }
}

const createController = () => {
  const stage = {addChild: vi.fn()}
  const controller = new PSceneSteamController({
    getPrefersReducedMotion: () => false,
    onRender: vi.fn(),
    stage: stage as unknown as Container,
  })

  return {controller, stage}
}

beforeEach(() => {
  vi.mocked(acquireTextureGroup).mockReset().mockResolvedValue(createLeases())
  vi.mocked(releaseTextureGroup).mockReset()
  vi.mocked(SteamParticleSystem).mockReset().mockImplementation(createSystem)
})

it('should skip original steam textures for a scribble scene', async () => {
  const {controller} = createController()

  await controller.ensure('scribble')

  expect(acquireTextureGroup).not.toHaveBeenCalled()
  controller.destroy()
})

it('should acquire original steam once when the style later requires it', async () => {
  const {controller, stage} = createController()
  controller.start()

  await Promise.all([controller.ensure('original'), controller.ensure('original')])

  expect(acquireTextureGroup).toHaveBeenCalledTimes(1)
  expect(stage.addChild).toHaveBeenCalledTimes(1)
  const system = vi.mocked(SteamParticleSystem).mock.results[0].value
  expect(system.start).toHaveBeenCalledTimes(1)

  controller.setSceneStyle('scribble')
  expect(system.setVisible).toHaveBeenLastCalledWith(false)

  controller.destroy()
  expect(system.destroy).toHaveBeenCalledTimes(1)
  expect(releaseTextureGroup).toHaveBeenCalledTimes(1)
})

it('should restore the latest parallax offset when steam loads lazily', async () => {
  const {controller} = createController()
  controller.setParallaxOffset(4.95, -3.3)

  await controller.ensure('original')

  const system = vi.mocked(SteamParticleSystem).mock.results[0].value
  expect(system.setParallaxOffset).toHaveBeenCalledWith(4.95, -3.3)
  controller.destroy()
})

it('should release textures that finish loading after destruction', async () => {
  let completeLoad: (leases: readonly TextureLease[]) => void = () => undefined
  vi.mocked(acquireTextureGroup).mockReturnValue(
    new Promise((resolve) => {
      completeLoad = resolve
    }),
  )
  const {controller} = createController()
  const loading = controller.ensure('original')

  controller.destroy()
  const leases = createLeases()
  completeLoad(leases)
  await loading

  expect(SteamParticleSystem).not.toHaveBeenCalled()
  expect(releaseTextureGroup).toHaveBeenCalledWith(leases)
})

it('should release textures when steam setup fails', async () => {
  const setupError = new Error('stage unavailable')
  const {controller, stage} = createController()
  stage.addChild.mockImplementationOnce(() => {
    throw setupError
  })

  await expect(controller.ensure('original')).rejects.toBe(setupError)

  const system = vi.mocked(SteamParticleSystem).mock.results[0].value
  expect(system.destroy).toHaveBeenCalledTimes(1)
  expect(releaseTextureGroup).toHaveBeenCalledWith(
    await vi.mocked(acquireTextureGroup).mock.results[0].value,
  )
})
