import {Container, Particle, ParticleContainer, Rectangle, Sprite} from 'pixi.js'
import {vi} from 'vitest'

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

interface MockParticleContainer<TParticle> {
  addParticle: ReturnType<typeof vi.fn>
  particles: TParticle[]
}

interface FallingMocks<TParticle> {
  readonly containers: MockContainer[]
  readonly install: () => void
  readonly particleContainers: MockParticleContainer<TParticle>[]
  readonly particles: TParticle[]
}

export const createFallingMocks = <TParticle extends MockParticle>(): FallingMocks<TParticle> => {
  const containers: MockContainer[] = []
  const particleContainers: MockParticleContainer<TParticle>[] = []
  const particles: TParticle[] = []

  const install = () => {
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
      const container: MockParticleContainer<TParticle> = {
        addParticle: vi.fn((particle: TParticle) => container.particles.push(particle)),
        particles: [],
      }
      particleContainers.push(container)
      return container as never
    })
    vi.mocked(Particle).mockImplementation(function MockParticleConstructor(options) {
      const particle = {...options} as unknown as TParticle
      particles.push(particle)
      return particle as never
    })
    vi.mocked(Rectangle).mockImplementation(function MockRectangleConstructor() {
      return {} as never
    })
    vi.mocked(Sprite).mockImplementation(function MockSpriteConstructor() {
      return {} as never
    })
  }

  return {containers, install, particleContainers, particles}
}
