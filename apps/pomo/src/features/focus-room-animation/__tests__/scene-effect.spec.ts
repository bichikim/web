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

  it.each(['falling-flakes', 'falling-streaks'] as const)(
    'should select %s from the first kind read',
    (kind) => {
      const Effect = kind === 'falling-flakes' ? FallingFlakesEffect : FallingStreaksEffect
      const otherEffect = kind === 'falling-flakes' ? FallingStreaksEffect : FallingFlakesEffect
      const effect = {
        advance: vi.fn(),
        container: {},
        destroy: vi.fn(),
        setAnimationEnabled: vi.fn(),
      }
      vi.mocked(Effect).mockImplementation(function MockEffect() {
        return effect as never
      })
      let kindReads = 0
      const selectedDefinition = {
        ...definition,
        get kind() {
          kindReads += 1
          return kindReads === 1
            ? kind
            : kind === 'falling-flakes'
              ? 'falling-streaks'
              : 'falling-flakes'
        },
      }

      const result = createSceneEffect({
        definition: selectedDefinition,
        height: 100,
        maskTextures: new Map([['/window-mask.png', {height: 100, width: 200} as never]]),
        random: vi.fn(),
        width: 200,
      })

      expect(kindReads).toBe(1)
      expect(Effect).toHaveBeenCalledOnce()
      expect(otherEffect).not.toHaveBeenCalled()
      expect(result.container).toBe(effect.container)
      expect(result.definition).toBe(selectedDefinition)
    },
  )

  it.each([
    [undefined, 'Missing scene effect mask texture: /window-mask.png'],
    [{height: 100, width: 199}, 'Scene effect mask dimensions must match the scene: rain'],
    [{height: 99, width: 200}, 'Scene effect mask dimensions must match the scene: rain'],
  ] as const)('should validate mask %j before reading the kind', (maskTexture, message) => {
    expect(() =>
      createSceneEffect({
        definition: {
          ...definition,
          get kind(): 'falling-streaks' {
            throw new Error('kind should not be read')
          },
        },
        height: 100,
        maskTextures:
          maskTexture === undefined
            ? new Map()
            : new Map([['/window-mask.png', maskTexture as never]]),
        random: vi.fn(),
        width: 200,
      }),
    ).toThrow(message)
    expect(FallingFlakesEffect).not.toHaveBeenCalled()
    expect(FallingStreaksEffect).not.toHaveBeenCalled()
  })

  it.each(['falling-flakes', 'falling-streaks'] as const)(
    'should retain the %s constructor failure identity',
    (kind) => {
      const Effect = kind === 'falling-flakes' ? FallingFlakesEffect : FallingStreaksEffect
      const failure = new Error('constructor failed')
      vi.mocked(Effect).mockImplementation(function FailingEffect() {
        throw failure
      })

      let caught: unknown
      try {
        createSceneEffect({
          definition: {...definition, kind},
          height: 100,
          maskTextures: new Map([['/window-mask.png', {height: 100, width: 200} as never]]),
          random: vi.fn(),
          width: 200,
        })
      } catch (error: unknown) {
        caught = error
      }
      expect(caught).toBe(failure)
    },
  )

  it.each(['falling-flakes', 'falling-streaks'] as const)(
    'should read current %s methods with the effect receiver',
    (kind) => {
      const Effect = kind === 'falling-flakes' ? FallingFlakesEffect : FallingStreaksEffect
      const effect = {
        advance: vi.fn(),
        container: {},
        destroy: vi.fn(),
        setAnimationEnabled: vi.fn(),
      }
      vi.mocked(Effect).mockImplementation(function MockEffect() {
        return effect as never
      })
      const result = createSceneEffect({
        definition: {...definition, kind},
        height: 100,
        maskTextures: new Map([['/window-mask.png', {height: 100, width: 200} as never]]),
        random: vi.fn(),
        width: 200,
      })
      effect.advance = vi.fn()
      effect.destroy = vi.fn()
      effect.setAnimationEnabled = vi.fn()

      result.advance(0.25)
      result.setAnimationEnabled(false)
      result.destroy()

      expect(effect.advance).toHaveBeenCalledExactlyOnceWith(0.25)
      expect(effect.setAnimationEnabled).toHaveBeenCalledExactlyOnceWith(false)
      expect(effect.destroy).toHaveBeenCalledOnce()
      expect(effect.advance.mock.contexts[0]).toBe(effect)
      expect(effect.setAnimationEnabled.mock.contexts[0]).toBe(effect)
      expect(effect.destroy.mock.contexts[0]).toBe(effect)
    },
  )

  it('should retain a cleanup failure when later construction also fails', () => {
    const cleanupFailure = new Error('cleanup failed')
    const constructionFailure = new Error('construction failed')
    const destroy = vi.fn(() => {
      throw cleanupFailure
    })
    vi.mocked(FallingFlakesEffect).mockImplementation(function MockEffect() {
      return {container: {}, destroy} as never
    })
    vi.mocked(FallingStreaksEffect).mockImplementation(function FailingEffect() {
      throw constructionFailure
    })

    let caught: unknown
    try {
      createSceneEffects({
        definitions: [{...definition, kind: 'falling-flakes'}, definition],
        height: 100,
        maskTextures: new Map([['/window-mask.png', {height: 100, width: 200} as never]]),
        random: vi.fn(),
        sceneContainer: {addChild: vi.fn()} as never,
        width: 200,
      })
    } catch (error: unknown) {
      caught = error
    }
    expect(caught).toBe(cleanupFailure)
    expect(destroy).toHaveBeenCalledOnce()
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

  it('should destroy completed effects when a later effect cannot be created', () => {
    const destroy = vi.fn()
    vi.mocked(FallingStreaksEffect)
      .mockImplementationOnce(
        class MockFallingStreaksEffect {
          readonly advance = vi.fn()
          readonly container = {}
          readonly destroy = destroy
          readonly setAnimationEnabled = vi.fn()
        } as never,
      )
      .mockImplementationOnce(
        class FailingFallingStreaksEffect {
          constructor() {
            throw new Error('effect unavailable')
          }
        } as never,
      )

    expect(() =>
      createSceneEffects({
        definitions: [definition, {...definition, id: 'second'}],
        height: 100,
        maskTextures: new Map([['/window-mask.png', {height: 100, width: 200} as never]]),
        random: vi.fn(),
        sceneContainer: {addChild: vi.fn()} as never,
        width: 200,
      }),
    ).toThrow('effect unavailable')
    expect(destroy).toHaveBeenCalledOnce()
  })
})
