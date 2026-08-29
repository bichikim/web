import {beforeEach, describe, expect, it, vi} from 'vitest'

import {FallingFlakesEffect} from '../falling-flakes-effect'
import {FallingStreaksEffect} from '../falling-streaks-effect'
import {createSceneEffect, createSceneEffects} from '../scene-effect'

vi.mock('../falling-flakes-effect', () => ({FallingFlakesEffect: vi.fn()}))
vi.mock('../falling-streaks-effect', () => ({FallingStreaksEffect: vi.fn()}))

const definition = {
  id: 'rain',
  kind: 'falling-streaks' as const,
  maskSource: '/window-mask.png',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createSceneEffect', () => {
  it('should create a falling streak effect with the scene mask', () => {
    const effect = {
      advance: vi.fn(),
      container: {},
      destroy: vi.fn(),
      setAnimationEnabled: vi.fn(),
    }
    vi.mocked(FallingStreaksEffect).mockImplementation(
      class MockFallingStreaksEffect {
        readonly container = effect.container
        readonly advance = effect.advance
        readonly destroy = effect.destroy
        readonly setAnimationEnabled = effect.setAnimationEnabled
      } as never,
    )
    const maskTexture = {height: 100, width: 200}
    const random = vi.fn()
    const result = createSceneEffect({
      definition: {...definition, opacity: 0.4},
      height: 100,
      maskTextures: new Map([['/window-mask.png', maskTexture as never]]),
      random,
      width: 200,
    })

    expect(FallingStreaksEffect).toHaveBeenCalledWith({
      height: 100,
      maskTexture,
      random,
      width: 200,
    })
    expect(result.container.alpha).toBe(0.4)
    result.advance(0.5)
    result.setAnimationEnabled(false)
    result.destroy()
    expect(effect.advance).toHaveBeenCalledWith(0.5)
    expect(effect.setAnimationEnabled).toHaveBeenCalledWith(false)
    expect(effect.destroy).toHaveBeenCalledOnce()
  })

  it('should create a falling flakes effect with the scene mask', () => {
    const effect = {
      advance: vi.fn(),
      container: {},
      destroy: vi.fn(),
      setAnimationEnabled: vi.fn(),
    }
    vi.mocked(FallingFlakesEffect).mockImplementation(
      class MockFallingFlakesEffect {
        readonly container = effect.container
        readonly advance = effect.advance
        readonly destroy = effect.destroy
        readonly setAnimationEnabled = effect.setAnimationEnabled
      } as never,
    )
    const maskTexture = {height: 100, width: 200}
    const random = vi.fn()
    const result = createSceneEffect({
      definition: {...definition, id: 'snow', kind: 'falling-flakes'},
      height: 100,
      maskTextures: new Map([['/window-mask.png', maskTexture as never]]),
      random,
      width: 200,
    })

    expect(FallingFlakesEffect).toHaveBeenCalledWith({
      height: 100,
      maskTexture,
      random,
      width: 200,
    })
    expect(result.container.alpha).toBe(1)
    result.advance(0.5)
    result.setAnimationEnabled(false)
    result.destroy()
    expect(effect.advance).toHaveBeenCalledWith(0.5)
    expect(effect.setAnimationEnabled).toHaveBeenCalledWith(false)
    expect(effect.destroy).toHaveBeenCalledOnce()
  })

  it('should reject a missing or incorrectly sized mask', () => {
    expect(() =>
      createSceneEffect({
        definition,
        height: 100,
        maskTextures: new Map(),
        random: vi.fn(),
        width: 200,
      }),
    ).toThrow('Missing scene effect mask texture: /window-mask.png')

    expect(() =>
      createSceneEffect({
        definition,
        height: 100,
        maskTextures: new Map([['/window-mask.png', {height: 99, width: 200} as never]]),
        random: vi.fn(),
        width: 200,
      }),
    ).toThrow('Scene effect mask dimensions must match the scene: rain')
  })

  it('should coordinate positioned and trailing effects', () => {
    const effects: Array<{
      advance: ReturnType<typeof vi.fn>
      container: object
      destroy: ReturnType<typeof vi.fn>
      setAnimationEnabled: ReturnType<typeof vi.fn>
    }> = []
    vi.mocked(FallingStreaksEffect).mockImplementation(
      class MockFallingStreaksEffect {
        readonly advance = vi.fn()
        readonly container = {}
        readonly destroy = vi.fn()
        readonly setAnimationEnabled = vi.fn()

        constructor() {
          effects.push(this)
        }
      } as never,
    )
    const sceneContainer = {addChild: vi.fn()}
    const collection = createSceneEffects({
      definitions: [
        {...definition, beforeLayerId: 'head'},
        {...definition, id: 'trailing'},
      ],
      height: 100,
      maskTextures: new Map([['/window-mask.png', {height: 100, width: 200} as never]]),
      random: vi.fn(),
      sceneContainer: sceneContainer as never,
      width: 200,
    })

    expect(collection.hasMotion).toBe(true)
    collection.attachBefore('head')
    collection.attachTrailing()
    expect(sceneContainer.addChild).toHaveBeenNthCalledWith(1, effects[0].container)
    expect(sceneContainer.addChild).toHaveBeenNthCalledWith(2, effects[1].container)

    collection.advance(0.25)
    collection.setAnimationEnabled(false)
    collection.destroy()
    for (const effect of effects) {
      expect(effect.advance).toHaveBeenCalledWith(0.25)
      expect(effect.setAnimationEnabled).toHaveBeenCalledWith(false)
      expect(effect.destroy).toHaveBeenCalledOnce()
    }
  })
})
