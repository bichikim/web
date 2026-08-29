import type {Container, Texture} from 'pixi.js'

import {FallingFlakesEffect} from './falling-flakes-effect'
import {FallingStreaksEffect} from './falling-streaks-effect'
import type {PixiSceneEffectDefinition} from './layer-scene-definition'

interface SceneEffectInstance {
  readonly container: Container
  readonly definition: PixiSceneEffectDefinition
  advance: (deltaSeconds: number) => void
  destroy: () => void
  setAnimationEnabled: (animationEnabled: boolean) => void
}

interface CreateSceneEffectOptions {
  readonly definition: PixiSceneEffectDefinition
  readonly height: number
  readonly maskTextures: ReadonlyMap<string, Texture>
  readonly random: () => number
  readonly width: number
}

export const createSceneEffect = (options: CreateSceneEffectOptions): SceneEffectInstance => {
  const maskTexture = options.maskTextures.get(options.definition.maskSource)

  if (maskTexture === undefined) {
    throw new Error(`Missing scene effect mask texture: ${options.definition.maskSource}`)
  }

  if (maskTexture.width !== options.width || maskTexture.height !== options.height) {
    throw new Error(`Scene effect mask dimensions must match the scene: ${options.definition.id}`)
  }

  switch (options.definition.kind) {
    case 'falling-flakes': {
      const effect = new FallingFlakesEffect({
        height: options.height,
        maskTexture,
        random: options.random,
        width: options.width,
      })
      effect.container.alpha = options.definition.opacity ?? 1

      return {
        advance: (deltaSeconds) => effect.advance(deltaSeconds),
        container: effect.container,
        definition: options.definition,
        destroy: () => effect.destroy(),
        setAnimationEnabled: (animationEnabled) => effect.setAnimationEnabled(animationEnabled),
      }
    }
    case 'falling-streaks': {
      const effect = new FallingStreaksEffect({
        height: options.height,
        maskTexture,
        random: options.random,
        width: options.width,
      })
      effect.container.alpha = options.definition.opacity ?? 1

      return {
        advance: (deltaSeconds) => effect.advance(deltaSeconds),
        container: effect.container,
        definition: options.definition,
        destroy: () => effect.destroy(),
        setAnimationEnabled: (animationEnabled) => effect.setAnimationEnabled(animationEnabled),
      }
    }
  }
}

export interface SceneEffectsInstance {
  readonly hasMotion: boolean
  advance: (deltaSeconds: number) => void
  attachBefore: (layerId: string) => void
  attachTrailing: () => void
  destroy: () => void
  setAnimationEnabled: (animationEnabled: boolean) => void
}

interface CreateSceneEffectsOptions {
  readonly definitions: readonly PixiSceneEffectDefinition[]
  readonly height: number
  readonly maskTextures: ReadonlyMap<string, Texture>
  readonly random: () => number
  readonly sceneContainer: Container
  readonly width: number
}

export const createSceneEffects = (options: CreateSceneEffectsOptions): SceneEffectsInstance => {
  const effects: SceneEffectInstance[] = []

  try {
    for (const definition of options.definitions) {
      effects.push(createSceneEffect({...options, definition}))
    }
  } catch (error: unknown) {
    for (const effect of effects) {
      effect.destroy()
    }
    throw error
  }

  return {
    advance: (deltaSeconds) => {
      for (const effect of effects) {
        effect.advance(deltaSeconds)
      }
    },
    attachBefore: (layerId) => {
      for (const effect of effects) {
        if (effect.definition.beforeLayerId === layerId) {
          options.sceneContainer.addChild(effect.container)
        }
      }
    },
    attachTrailing: () => {
      for (const effect of effects) {
        if (effect.definition.beforeLayerId === undefined) {
          options.sceneContainer.addChild(effect.container)
        }
      }
    },
    destroy: () => {
      for (const effect of effects) {
        effect.destroy()
      }
    },
    hasMotion: effects.length > 0,
    setAnimationEnabled: (animationEnabled) => {
      for (const effect of effects) {
        effect.setAnimationEnabled(animationEnabled)
      }
    },
  }
}
