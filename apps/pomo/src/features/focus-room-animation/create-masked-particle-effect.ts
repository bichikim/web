import {Container, Particle, ParticleContainer, Rectangle, Sprite, Texture} from 'pixi.js'
export interface MaskedParticleEffectOptions {
  readonly width: number
  readonly height: number
  readonly maskTexture: Texture
  readonly rotation: boolean
}
/** Owns a red-masked particle container, visibility and idempotent teardown. */
export const createMaskedParticleEffect = (options: MaskedParticleEffectOptions) => {
  const container = new Container()
  const particles = new ParticleContainer<Particle>({
    boundsArea: new Rectangle(0, 0, options.width, options.height),
    dynamicProperties: {
      color: false,
      position: true,
      rotation: options.rotation,
      uvs: false,
      vertex: false,
    },
    texture: Texture.WHITE,
  })
  const content = new Container()
  const mask = new Sprite(options.maskTexture)
  content.addChild(particles)
  container.addChild(mask, content)
  content.setMask({channel: 'red', mask})
  let destroyed = false
  const destroy = () => {
    if (destroyed) {
      return
    }
    destroyed = true
    container.removeFromParent()
    container.destroy({children: true})
  }
  return {
    container,
    destroy,
    isDestroyed: () => destroyed,
    particles,
    setAnimationEnabled: (enabled: boolean) => {
      container.visible = enabled
    },
  }
}
