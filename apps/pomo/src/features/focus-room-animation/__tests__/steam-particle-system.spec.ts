/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import type {Texture} from 'pixi.js'

const pixiMocks = vi.hoisted(() => {
  const containers: ContainerMock[] = []
  const sprites: SpriteMock[] = []

  class ContainerMock {
    readonly children: SpriteMock[] = []
    readonly destroy = vi.fn()
    readonly position = {set: vi.fn()}
    readonly removeFromParent = vi.fn()
    visible = true

    constructor() {
      containers.push(this)
    }

    addChild(sprite: SpriteMock) {
      this.children.push(sprite)
      return sprite
    }
  }

  class SpriteMock {
    readonly anchor = {set: vi.fn()}
    alpha = 1
    readonly position = {set: vi.fn()}
    rotation = 0
    readonly scale = {set: vi.fn()}
    readonly texture: unknown

    constructor(texture: unknown) {
      this.texture = texture
      sprites.push(this)
    }
  }

  return {ContainerMock, containers, SpriteMock, sprites}
})

vi.mock('pixi.js', () => ({
  Container: pixiMocks.ContainerMock,
  Sprite: pixiMocks.SpriteMock,
}))

import {SteamParticleSystem} from '../steam-particle-system'

const createFrames = () => {
  const callbacks = new Map<number, FrameRequestCallback>()
  let frameId = 0

  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frameId += 1
    callbacks.set(frameId, callback)
    return frameId
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    callbacks.delete(id)
  })

  return callbacks
}

const createSystem = (prefersReducedMotion = false) => {
  const onRender = vi.fn()
  const textures = [{id: 'steam-a'} as unknown as Texture, {id: 'steam-b'} as unknown as Texture]
  const system = new SteamParticleSystem({onRender, prefersReducedMotion, textures})

  return {onRender, system, textures}
}

describe('SteamParticleSystem', () => {
  beforeEach(() => {
    pixiMocks.containers.length = 0
    pixiMocks.sprites.length = 0
    vi.spyOn(window.performance, 'now').mockReturnValue(100)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should initialize four alternating particles and update them on each frame', () => {
    const frames = createFrames()
    const {onRender, system, textures} = createSystem()

    expect(pixiMocks.sprites).toHaveLength(4)
    expect(pixiMocks.sprites.map((sprite) => sprite.texture)).toEqual([
      textures[0],
      textures[1],
      textures[0],
      textures[1],
    ])
    expect(pixiMocks.sprites.every((sprite) => sprite.anchor.set.mock.calls[0]?.[0] === 0.5)).toBe(
      true,
    )
    expect(pixiMocks.sprites.map((sprite) => sprite.rotation)).toEqual([-0.12, 0, 0.12, -0.12])

    system.start()
    system.start()
    expect(frames).toHaveLength(1)

    const firstFrame = frames.values().next().value
    frames.clear()
    firstFrame?.(100)

    expect(onRender).toHaveBeenCalledOnce()
    expect(frames).toHaveLength(1)
    expect(pixiMocks.sprites.every((sprite) => sprite.position.set.mock.calls.length === 1)).toBe(
      true,
    )
    expect(pixiMocks.sprites.every((sprite) => sprite.scale.set.mock.calls.length === 1)).toBe(true)
    expect(pixiMocks.sprites.map((sprite) => sprite.alpha)).toEqual([
      0,
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
    ])

    system.destroy()
  })

  it('should switch between animated and reduced-motion rendering while visible', () => {
    const frames = createFrames()
    const {onRender, system} = createSystem()

    system.setReducedMotion(false)
    system.start()
    expect(frames).toHaveLength(1)

    system.setReducedMotion(true)
    expect(window.cancelAnimationFrame).toHaveBeenCalledOnce()
    expect(frames).toHaveLength(0)
    expect(onRender).toHaveBeenCalledOnce()

    system.setReducedMotion(true)
    system.setReducedMotion(false)
    expect(frames).toHaveLength(1)
    expect(window.performance.now).toHaveBeenCalledTimes(2)

    system.destroy()
  })

  it('should defer reduced-motion rendering until a hidden system becomes visible', () => {
    const frames = createFrames()
    const {onRender, system} = createSystem(true)

    system.setVisible(false)
    system.start()
    system.setReducedMotion(false)
    expect(frames).toHaveLength(0)

    system.setReducedMotion(true)
    system.setVisible(true)

    expect(system.container.visible).toBe(true)
    expect(onRender).toHaveBeenCalledOnce()
    expect(frames).toHaveLength(0)

    system.destroy()
  })

  it('should pause and resume animation when visibility changes', () => {
    const frames = createFrames()
    const {onRender, system} = createSystem()

    system.start()
    system.setVisible(false)
    expect(system.container.visible).toBe(false)
    expect(frames).toHaveLength(0)
    expect(onRender).toHaveBeenCalledOnce()

    system.setVisible(false)
    system.setVisible(true)
    expect(frames).toHaveLength(1)
    expect(onRender).toHaveBeenCalledTimes(2)

    system.destroy()
  })

  it('should preserve pre-start visibility and motion changes without scheduling work', () => {
    const frames = createFrames()
    const {onRender, system} = createSystem()

    system.setReducedMotion(true)
    system.setVisible(false)
    system.setVisible(true)

    expect(frames).toHaveLength(0)
    expect(onRender).not.toHaveBeenCalled()

    system.start()
    expect(onRender).toHaveBeenCalledOnce()

    system.destroy()
  })

  it('should set parallax and release active resources exactly once', () => {
    createFrames()
    const {system} = createSystem()

    system.start()
    system.setParallaxOffset(4, -3)
    system.destroy()
    system.destroy()
    system.start()
    system.setReducedMotion(true)
    system.setVisible(false)

    const [container] = pixiMocks.containers
    expect(container.position.set).toHaveBeenCalledWith(4, -3)
    expect(window.cancelAnimationFrame).toHaveBeenCalledOnce()
    expect(container.removeFromParent).toHaveBeenCalledOnce()
    expect(container.destroy).toHaveBeenCalledWith({children: true})
  })

  it('should not schedule another frame when rendering destroys the system', () => {
    const frames = createFrames()
    const system = new SteamParticleSystem({
      onRender: () => system.destroy(),
      prefersReducedMotion: false,
      textures: [{id: 'steam'} as unknown as Texture],
    })
    system.start()

    const frame = frames.values().next().value
    frames.clear()
    frame?.(100)

    expect(frames).toHaveLength(0)
    expect(pixiMocks.containers[0].destroy).toHaveBeenCalledOnce()
  })
})
