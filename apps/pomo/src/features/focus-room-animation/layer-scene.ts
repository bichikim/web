import {Container, type Filter, Sprite, type Texture, Ticker} from 'pixi.js'

import {MaskedPixelPushFilter} from './masked-pixel-push-filter'
import {PixelPushFilter} from './pixel-push-filter'
import {acquireTextureGroup, releaseTextureGroup, type TextureLease} from './texture-leases'

export interface PixiScenePoint {
  readonly x: number
  readonly y: number
}

export interface PixiSceneTravelRange {
  readonly maximumSeconds: number
  readonly minimumSeconds: number
}

export interface PixiSceneRectangle extends PixiScenePoint {
  readonly height: number
  readonly width: number
}

export interface PixiScenePixelPush {
  readonly distance: PixiScenePoint
  readonly featherPixels: number
  readonly kind: 'pixel-push'
  readonly region: PixiSceneRectangle
}

export interface PixiSceneMaskedPixelPush {
  readonly distance: PixiScenePoint
  readonly kind: 'masked-pixel-push'
  readonly maskSource: string
}

export type PixiScenePushEffect = PixiSceneMaskedPixelPush | PixiScenePixelPush

export interface PixiScenePivotRotation {
  readonly center: PixiScenePoint
  readonly degrees: number
  readonly kind: 'pivot-rotation'
  readonly pixelPush?: readonly PixiScenePushEffect[]
  readonly travel: PixiSceneTravelRange
}

export interface PixiSceneLayerDefinition {
  readonly channel?: string
  readonly id: string
  readonly motion?: PixiScenePivotRotation
  readonly opacity?: number
  readonly source: string
  readonly visible?: boolean
}

export interface PixiLayerSceneDefinition {
  readonly background: string
  readonly height: number
  readonly id: string
  readonly layers: readonly PixiSceneLayerDefinition[]
  readonly width: number
}

export interface PixiSceneChannelState {
  readonly opacity?: number
  readonly visible?: boolean
}

export interface PixiLayerSceneState {
  readonly animationEnabled: boolean
  readonly channels?: Readonly<Record<string, PixiSceneChannelState>>
}

export interface PixiLayerSceneOptions {
  readonly onRender: () => void
  readonly random?: () => number
}

interface MotionState {
  direction: 1 | -1
  elapsedSeconds: number
  travelSeconds: number
}

interface LayerInstance {
  readonly container: Container
  readonly definition: PixiSceneLayerDefinition
  readonly motion: MotionState | null
  readonly pixelPushFilters: readonly PushFilter[]
  readonly sprite: Sprite
}

interface PushFilter extends Filter {
  setProgress(progress: number): void
}

export interface CreateStaticLayerSceneOptions {
  readonly background: string
  readonly height: number
  readonly id: string
  readonly source: string
  readonly width: number
}

const MILLISECONDS_PER_SECOND = 1000
const DEGREES_PER_HALF_TURN = 180

const clampUnit = (value: number) => Math.min(1, Math.max(0, value))

export const createStaticLayerScene = (
  options: CreateStaticLayerSceneOptions,
): PixiLayerSceneDefinition => ({
  background: options.background,
  height: options.height,
  id: options.id,
  layers: [{id: 'scene', source: options.source}],
  width: options.width,
})

/** Renders an ordered layer definition and owns its Pixi textures and animation ticker. */
export class PixiLayerScene {
  readonly container = new Container()
  readonly #definition: PixiLayerSceneDefinition
  readonly #onRender: () => void
  readonly #random: () => number
  readonly #ticker = new Ticker()
  #destroyed = false
  #layers: readonly LayerInstance[] = []
  #textures: readonly TextureLease[] = []

  constructor(definition: PixiLayerSceneDefinition, options: PixiLayerSceneOptions) {
    this.#definition = definition
    this.#onRender = options.onRender
    this.#random = options.random ?? Math.random
    this.#ticker.add(this.#advance)
  }

  async initialize(state: PixiLayerSceneState) {
    const layerSources = this.#definition.layers.map((layer) => layer.source)
    const maskSources = [
      ...new Set(
        this.#definition.layers.flatMap(
          (layer) =>
            layer.motion?.pixelPush?.flatMap((effect) =>
              effect.kind === 'masked-pixel-push' ? [effect.maskSource] : [],
            ) ?? [],
        ),
      ),
    ]
    const textures = await acquireTextureGroup([...layerSources, ...maskSources])

    if (this.#destroyed) {
      releaseTextureGroup(textures)
      return
    }

    this.#textures = textures
    const maskTextures = new Map<string, Texture>(
      textures.slice(layerSources.length).map((lease) => [lease.source, lease.texture]),
    )
    this.#layers = this.#definition.layers.map((definition, index) => {
      const container = new Container()
      const sprite = new Sprite(textures[index].texture)
      const {motion} = definition

      if (motion !== undefined) {
        container.pivot.set(motion.center.x, motion.center.y)
        container.position.set(motion.center.x, motion.center.y)
      }

      const pixelPushFilters =
        motion?.pixelPush?.map((effect) => this.#createPushFilter(effect, maskTextures)) ?? []
      sprite.filters = pixelPushFilters

      container.addChild(sprite)
      this.container.addChild(container)

      return {
        container,
        definition,
        motion: motion === undefined ? null : this.#createMotionState(motion.travel),
        pixelPushFilters,
        sprite,
      }
    })
    this.update(state)
  }

  update(state: PixiLayerSceneState) {
    for (const layer of this.#layers) {
      const {channel} = layer.definition
      const channelState = channel === undefined ? undefined : state.channels?.[channel]
      layer.container.alpha =
        clampUnit(layer.definition.opacity ?? 1) * clampUnit(channelState?.opacity ?? 1)
      layer.container.visible = channelState?.visible ?? layer.definition.visible ?? true
    }

    if (state.animationEnabled && this.#hasMotion()) {
      this.#ticker.start()
    } else {
      this.#ticker.stop()
      this.#resetMotion()
    }

    this.#onRender()
  }

  destroy() {
    if (this.#destroyed) {
      return
    }

    this.#destroyed = true
    this.#ticker.destroy()

    for (const layer of this.#layers) {
      for (const filter of layer.pixelPushFilters) {
        filter.destroy()
      }
    }

    this.container.destroy({children: true})
    releaseTextureGroup(this.#textures)
    this.#textures = []
    this.#layers = []
  }

  readonly #advance = (ticker: Ticker) => {
    const deltaSeconds = ticker.deltaMS / MILLISECONDS_PER_SECOND

    for (const layer of this.#layers) {
      const {motion} = layer.definition

      if (motion !== undefined && layer.motion !== null) {
        this.#advanceMotion(layer, motion, deltaSeconds)
      }
    }

    this.#onRender()
  }

  #advanceMotion(layer: LayerInstance, motion: PixiScenePivotRotation, deltaSeconds: number) {
    const state = layer.motion

    if (state === null) {
      return
    }

    state.elapsedSeconds += deltaSeconds
    const travelProgress = Math.min(1, state.elapsedSeconds / state.travelSeconds)
    const easedProgress = (1 - Math.cos(travelProgress * Math.PI)) / 2
    const motionProgress = state.direction === 1 ? easedProgress : 1 - easedProgress
    layer.container.rotation = (motionProgress * (motion.degrees * Math.PI)) / DEGREES_PER_HALF_TURN

    for (const filter of layer.pixelPushFilters) {
      filter.setProgress(motionProgress)
    }

    if (travelProgress === 1) {
      state.direction = state.direction === 1 ? -1 : 1
      state.elapsedSeconds = 0
      state.travelSeconds = this.#randomDuration(motion.travel)
    }
  }

  #createMotionState(range: PixiSceneTravelRange): MotionState {
    return {
      direction: 1,
      elapsedSeconds: 0,
      travelSeconds: this.#randomDuration(range),
    }
  }

  #createPushFilter(
    effect: PixiScenePushEffect,
    maskTextures: ReadonlyMap<string, Texture>,
  ): PushFilter {
    switch (effect.kind) {
      case 'masked-pixel-push': {
        const maskTexture = maskTextures.get(effect.maskSource)

        if (maskTexture === undefined) {
          throw new Error(`Missing pixel-push mask texture: ${effect.maskSource}`)
        }

        return new MaskedPixelPushFilter({
          distanceX: effect.distance.x,
          distanceY: effect.distance.y,
          maskTexture,
        })
      }
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

  #hasMotion() {
    return this.#layers.some((layer) => layer.motion !== null)
  }

  #randomDuration(range: PixiSceneTravelRange) {
    return range.minimumSeconds + this.#random() * (range.maximumSeconds - range.minimumSeconds)
  }

  #resetMotion() {
    for (const layer of this.#layers) {
      const {motion} = layer.definition

      if (motion !== undefined && layer.motion !== null) {
        layer.motion.direction = 1
        layer.motion.elapsedSeconds = 0
        layer.motion.travelSeconds = this.#randomDuration(motion.travel)
        layer.container.position.set(motion.center.x, motion.center.y)
        layer.container.rotation = 0

        for (const filter of layer.pixelPushFilters) {
          filter.setProgress(0)
        }
      }
    }
  }
}
