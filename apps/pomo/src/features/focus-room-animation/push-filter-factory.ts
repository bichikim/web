import type {Filter, Texture} from 'pixi.js'

import {MaskedPixelPushFilter} from './masked-pixel-push-filter'
import {PixelPushFilter} from './pixel-push-filter'
import type {PixiScenePushEffect} from './layer-scene-definition'

export interface PushFilter extends Filter {
  setProgress(progress: number): void
}

const createMaskedPixelPushFilter = (
  effect: Extract<PixiScenePushEffect, {kind: 'masked-pixel-push'}>,
  maskTextures: ReadonlyMap<string, Texture>,
  layerTexture: Texture,
) => {
  const maskTexture = maskTextures.get(effect.maskSource)

  if (maskTexture === undefined) {
    throw new Error(`Missing pixel-push mask texture: ${effect.maskSource}`)
  }

  if (maskTexture.width !== layerTexture.width || maskTexture.height !== layerTexture.height) {
    throw new Error(`Pixel-push mask dimensions must match the layer: ${effect.maskSource}`)
  }

  return new MaskedPixelPushFilter({
    distanceX: effect.distance.x,
    distanceY: effect.distance.y,
    maskTexture,
  })
}

export const createPushFilter = (
  effect: PixiScenePushEffect,
  maskTextures: ReadonlyMap<string, Texture>,
  layerTexture: Texture,
): PushFilter => {
  switch (effect.kind) {
    case 'masked-pixel-push':
      return createMaskedPixelPushFilter(effect, maskTextures, layerTexture)
    case 'pixel-push':
      return new PixelPushFilter({
        distanceX: effect.distance.x,
        distanceY: effect.distance.y,
        featherPixels: effect.featherPixels,
        height: effect.region.height,
        width: effect.region.width,
        x: effect.region.x,
        y: effect.region.y,
      })
    default: {
      const exhaustiveEffect: never = effect
      throw new Error(`Unsupported pixel-push effect: ${String(exhaustiveEffect)}`)
    }
  }
}

export const createPushFilters = (
  effects: readonly PixiScenePushEffect[],
  maskTextures: ReadonlyMap<string, Texture>,
  layerTexture: Texture,
) => {
  const filters: PushFilter[] = []

  try {
    for (const effect of effects) {
      filters.push(createPushFilter(effect, maskTextures, layerTexture))
    }

    return filters
  } catch (error: unknown) {
    for (const filter of filters) {
      filter.destroy()
    }

    throw error
  }
}
