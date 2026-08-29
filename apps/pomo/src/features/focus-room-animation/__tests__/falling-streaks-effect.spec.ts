import {Container, Particle, ParticleContainer, Rectangle, Sprite, Texture} from 'pixi.js'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {FallingStreaksEffect} from '../falling-streaks-effect'

interface MockContainer {
  addChild: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
  removeFromParent: ReturnType<typeof vi.fn>
  setMask: ReturnType<typeof vi.fn>
  visible: boolean
}

interface MockParticle {
  x: number
  y: number
}

interface MockParticleContainer {
  addParticle: ReturnType<typeof vi.fn>
  particles: MockParticle[]
}

const containers: MockContainer[] = []
const particleContainers: MockParticleContainer[] = []
const particles: MockParticle[] = []

vi.mock('pixi.js', () => ({
  Container: vi.fn(),
  Particle: vi.fn(),
  ParticleContainer: vi.fn(),
  Rectangle: vi.fn(),
  Sprite: vi.fn(),
  Texture: {WHITE: {height: 16, width: 16}},
}))

beforeEach(() => {
  containers.length = 0
  particleContainers.length = 0
  particles.length = 0

  vi.mocked(Container).mockImplementation(function MockContainerConstructor() {
    const container: MockContainer = {
      addChild: vi.fn(),
      destroy: vi.fn(),
      removeFromParent: vi.fn(),
      setMask: vi.fn(),
      visible: true,
    }
    containers.push(container)
    return container as never
  })
  vi.mocked(ParticleContainer).mockImplementation(function MockParticleContainerConstructor() {
    const container: MockParticleContainer = {
      addParticle: vi.fn((particle: MockParticle) => container.particles.push(particle)),
      particles: [],
    }
    particleContainers.push(container)
    return container as never
  })
  vi.mocked(Particle).mockImplementation(function MockParticleConstructor(options) {
    const particle = {...options} as MockParticle
    particles.push(particle)
    return particle as never
  })
  vi.mocked(Rectangle).mockImplementation(function MockRectangleConstructor() {
    return {} as never
  })
  vi.mocked(Sprite).mockImplementation(function MockSpriteConstructor() {
    return {} as never
  })
})

describe('FallingStreaksEffect', () => {
  it('should create masked depth-layered particles and advance their positions', () => {
    const effect = new FallingStreaksEffect({
      height: 100,
      maskTexture: {height: 100, width: 200} as never,
      random: () => 0.5,
      width: 200,
    })

    expect(particles).toHaveLength(72)
    expect(particleContainers[0].addParticle).toHaveBeenCalledTimes(72)
    expect(containers[1].setMask).toHaveBeenCalledWith({channel: 'red', mask: expect.anything()})
    const initialX = particles[0].x
    const initialY = particles[0].y

    effect.advance(0.1)

    expect(particles[0].x).toBeGreaterThan(initialX)
    expect(particles[0].y).toBeGreaterThan(initialY)

    effect.setAnimationEnabled(false)
    expect(containers[0].visible).toBe(false)
  })

  it('should recycle escaped particles and destroy once', () => {
    const effect = new FallingStreaksEffect({
      height: 100,
      maskTexture: {height: 100, width: 200} as never,
      random: () => 0.5,
      width: 200,
    })
    particles[0].x = 300
    particles[0].y = 200

    effect.advance(0.1)
    expect(particles[0]).toMatchObject({x: 52, y: -24})

    effect.destroy()
    effect.advance(0.1)
    effect.destroy()

    expect(containers[0].removeFromParent).toHaveBeenCalledOnce()
    expect(containers[0].destroy).toHaveBeenCalledOnce()
  })
})
