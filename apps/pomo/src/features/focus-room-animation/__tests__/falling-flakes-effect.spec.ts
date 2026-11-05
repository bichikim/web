/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {createFallingMocks} from './support/falling'

import {FallingFlakesEffect} from '../falling-flakes-effect'

interface MockParticle {
  rotation: number
  scaleY: number
  tint: number
  x: number
  y: number
}

const mocks = createFallingMocks<MockParticle>()
const {containers, particleContainers, particles} = mocks

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

  mocks.install()
})

describe('FallingFlakesEffect', () => {
  it('should create masked depth-layered flakes and advance their movement', () => {
    const effect = new FallingFlakesEffect({
      height: 100,
      maskTexture: {height: 100, width: 200} as never,
      random: () => 0.5,
      width: 200,
    })

    expect(particles).toHaveLength(720)
    expect(particleContainers[0].addParticle).toHaveBeenCalledTimes(720)
    expect(containers[1].setMask).toHaveBeenCalledWith({channel: 'red', mask: expect.anything()})
    expect(particles[1].rotation - particles[0].rotation).toBeCloseTo(Math.PI / 3)
    expect(particles[2].rotation - particles[0].rotation).toBeCloseTo((Math.PI * 2) / 3)
    expect(particles[0].scaleY).toBeLessThan(particles[24].scaleY)
    expect(new Set(particles.map(({tint}) => tint))).toEqual(new Set([0xffffff]))
    expect(particles.slice(0, 3).map(({x, y}) => ({x, y}))).toEqual([
      {x: 100, y: 50},
      {x: 100, y: 50},
      {x: 100, y: 50},
    ])
    const initialX = particles[0].x
    const initialY = particles[0].y

    effect.advance(0.5)

    expect(particles[0].x).toBeLessThan(initialX)
    expect(particles[0].y).toBeGreaterThan(initialY)
    expect(particles.slice(0, 3).map(({x, y}) => ({x, y}))).toEqual([
      {x: particles[0].x, y: particles[0].y},
      {x: particles[0].x, y: particles[0].y},
      {x: particles[0].x, y: particles[0].y},
    ])

    effect.setAnimationEnabled(false)
    expect(containers[0].visible).toBe(false)
  })

  it('should recycle escaped flakes and destroy once', () => {
    const effect = new FallingFlakesEffect({
      height: 100,
      maskTexture: {height: 100, width: 200} as never,
      random: () => 0.5,
      width: 200,
    })
    particles[0].x = 300
    particles[0].y = 200

    effect.advance(0.1)
    for (const particle of particles.slice(0, 3)) {
      expect(particle).toMatchObject({x: 100, y: -12})
    }

    effect.destroy()
    effect.advance(0.1)
    effect.destroy()

    expect(containers[0].removeFromParent).toHaveBeenCalledOnce()
    expect(containers[0].destroy).toHaveBeenCalledOnce()
  })
})
