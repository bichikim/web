/** @vitest-environment jsdom */
import {type Application, Container, Texture, TextureSource, type Ticker} from 'pixi.js'
import {expect, it, vi} from 'vitest'
import {PhotoTransition} from '../transition'
import {ScreenEffect} from '../effect'

vi.mock('../effect', () => ({
  ScreenEffect: vi.fn(
    class {
      destroy = vi.fn()
      setProgress = vi.fn()
    },
  ),
}))

it.each(['fade', 'directional-wipe', 'cross-warp', 'circle-open', 'rgb-kinetic'] as const)(
  'should animate %s and release all screen snapshots on completion and cancellation',
  async (effect) => {
    const textures: Texture[] = []
    const stage = new Container()
    const listeners = new Set<(ticker: Ticker) => void>()
    const application = {
      render: vi.fn(),
      renderer: {
        generateTexture: vi.fn(() => {
          const texture = new Texture({source: new TextureSource({height: 600, width: 300})})
          textures.push(texture)
          return texture
        }),
        resolution: 1,
        screen: {height: 600, width: 300},
      },
      stage,
      start: vi.fn(),
      stop: vi.fn(),
      ticker: {
        add: (listener: (ticker: Ticker) => void) => listeners.add(listener),
        remove: (listener: (ticker: Ticker) => void) => listeners.delete(listener),
      },
    }
    const transition = new PhotoTransition(application as unknown as Application)
    expect(await transition.play(effect)).toBe(true)
    expect(application.start).not.toHaveBeenCalled()
    transition.capture()
    expect(stage.children).toHaveLength(1)
    const overlay = stage.children[0]!
    expect(overlay.alpha).toBe(1)
    const playing = transition.play(effect)
    for (const listener of listeners) {
      listener({elapsedMS: 250} as Ticker)
    }
    if (effect === 'fade') {
      expect(overlay.alpha).toBeCloseTo(0.5)
    } else {
      expect(overlay.alpha).toBe(1)
      expect(application.renderer.generateTexture).toHaveBeenCalledTimes(2)
      const filter = vi.mocked(ScreenEffect).mock.results.at(-1)?.value as ScreenEffect
      expect(filter.setProgress).toHaveBeenCalledWith(0.5)
    }
    transition.resize(600, 300)
    expect(overlay.width).toBe(600)
    expect(overlay.height).toBe(300)
    for (const listener of listeners) {
      listener({elapsedMS: 250} as Ticker)
    }
    expect(await playing).toBe(true)
    expect(listeners.size).toBe(0)
    expect(stage.children).toHaveLength(0)
    expect(textures[0]?.destroyed).toBe(true)
    expect(application.stop).toHaveBeenCalled()
    transition.capture()
    const canceled = transition.play(effect)
    transition.cancel()
    expect(await canceled).toBe(false)
    expect(stage.children).toHaveLength(1)
    expect(await transition.play('none')).toBe(true)
    expect(stage.children).toHaveLength(0)
    transition.capture()
    const disposed = transition.play(effect)
    transition.clear()
    expect(await disposed).toBe(false)
    expect(textures.every((texture) => texture.destroyed)).toBe(true)
    expect(listeners.size).toBe(0)
  },
)
