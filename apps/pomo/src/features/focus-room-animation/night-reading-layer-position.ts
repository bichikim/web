import layerLayout from './assets/layers/night-reading-focused/layout.json'

import type {PixiScenePoint} from './layer-scene-definition'

export interface PositionedLayerSource {
  readonly position: PixiScenePoint
  readonly source: string
}

export const positionNightReadingLayer = (
  id: keyof typeof layerLayout,
  source: string,
): PositionedLayerSource => ({position: layerLayout[id], source})
