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
  readonly channel?: string
  readonly center: PixiScenePoint
  readonly degrees: number
  readonly kind: 'pivot-rotation'
  readonly pixelPush?: readonly PixiScenePushEffect[]
  readonly travel: PixiSceneTravelRange
}

export interface PixiScenePixelOscillation {
  readonly channel?: string
  readonly effects: readonly PixiScenePushEffect[]
  readonly kind: 'pixel-oscillation'
  readonly travel: PixiSceneTravelRange
}

export type PixiSceneMotion = PixiScenePivotRotation | PixiScenePixelOscillation

export interface PixiSceneLayerDefinition {
  readonly attachmentId?: string
  readonly channel?: string
  readonly id: string
  readonly motion?: PixiSceneMotion
  readonly motions?: readonly PixiSceneMotion[]
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
  readonly motions: readonly MotionInstance[]
  readonly sprite: Sprite
}

interface MotionInstance {
  readonly definition: PixiSceneMotion
  enabled: boolean
  readonly pixelPushFilters: readonly PushFilter[]
  readonly state: MotionState
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

const getLayerMotions = (layer: PixiSceneLayerDefinition) => {
  if (layer.motion !== undefined) {
    return [layer.motion]
  }

  return layer.motions ?? []
}

const getMotionEffects = (motion: PixiSceneMotion) => {
  switch (motion.kind) {
    case 'pivot-rotation':
      return motion.pixelPush ?? []
    case 'pixel-oscillation':
      return motion.effects
    default: {
      const exhaustiveMotion: never = motion
      throw new Error(`Unsupported scene motion: ${String(exhaustiveMotion)}`)
    }
  }
}

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
  #animationEnabled = false
  #destroyed = false
  #initialized = false
  #layers: readonly LayerInstance[] = []
  #textures: readonly TextureLease[] = []

  constructor(definition: PixiLayerSceneDefinition, options: PixiLayerSceneOptions) {
    this.#definition = definition
    this.#onRender = options.onRender
    this.#random = options.random ?? Math.random
    this.#ticker.add(this.#advance)
  }

  async initialize(state: PixiLayerSceneState) {
    if (this.#destroyed || this.#initialized) {
      throw new Error(`Layer scene can only be initialized once: ${this.#definition.id}`)
    }

    this.#initialized = true

    try {
      this.#validateDefinition()
    } catch (error: unknown) {
      this.destroy()
      throw error
    }

    const layerSources = this.#definition.layers.map((layer) => layer.source)
    const maskSources = [
      ...new Set(
        this.#definition.layers.flatMap((layer) =>
          getLayerMotions(layer).flatMap((motion) =>
            getMotionEffects(motion).flatMap((effect) =>
              effect.kind === 'masked-pixel-push' ? [effect.maskSource] : [],
            ),
          ),
        ),
      ),
    ]
    let textures: readonly TextureLease[]

    try {
      textures = await acquireTextureGroup([...layerSources, ...maskSources])
    } catch (error: unknown) {
      this.destroy()
      throw error
    }

    if (this.#destroyed) {
      releaseTextureGroup(textures)
      return
    }

    this.#textures = textures
    const layers: LayerInstance[] = []

    try {
      this.#validateTextureSizes(textures, layerSources.length)
      const maskTextures = new Map<string, Texture>(
        textures.slice(layerSources.length).map((lease) => [lease.source, lease.texture]),
      )

      for (const [index, definition] of this.#definition.layers.entries()) {
        const container = new Container()
        const sprite = new Sprite(textures[index].texture)
        const motions = getLayerMotions(definition)
        const pivotMotion = motions.find((motion) => motion.kind === 'pivot-rotation')

        if (pivotMotion !== undefined) {
          container.pivot.set(pivotMotion.center.x, pivotMotion.center.y)
          container.position.set(pivotMotion.center.x, pivotMotion.center.y)
        }

        const motionInstances = this.#createMotionInstances(motions, maskTextures)
        sprite.filters = motionInstances.flatMap((motion) => motion.pixelPushFilters)
        container.addChild(sprite)
        this.container.addChild(container)
        layers.push({
          container,
          definition,
          motions: motionInstances,
          sprite,
        })
      }

      this.#layers = layers
      this.update(state)
    } catch (error: unknown) {
      this.#layers = layers
      this.destroy()
      throw error
    }
  }

  update(state: PixiLayerSceneState) {
    this.#animationEnabled = state.animationEnabled

    for (const layer of this.#layers) {
      const {channel} = layer.definition
      const channelState = channel === undefined ? undefined : state.channels?.[channel]
      layer.container.alpha =
        clampUnit(layer.definition.opacity ?? 1) * clampUnit(channelState?.opacity ?? 1)
      layer.container.visible = channelState?.visible ?? layer.definition.visible ?? true

      for (const motion of layer.motions) {
        const motionChannel = motion.definition.channel
        const motionChannelState =
          motionChannel === undefined ? undefined : state.channels?.[motionChannel]
        motion.enabled = layer.container.visible && (motionChannelState?.visible ?? true)

        if (!motion.enabled) {
          this.#resetMotionInstance(layer, motion)
        }
      }
    }

    this.#syncTicker()
    this.#onRender()
  }

  setAnimationEnabled(animationEnabled: boolean) {
    if (animationEnabled === this.#animationEnabled) {
      return
    }

    this.#animationEnabled = animationEnabled
    this.#syncTicker()
    this.#onRender()
  }

  #syncTicker() {
    if (this.#animationEnabled && this.#hasMotion()) {
      this.#ticker.start()
    } else {
      this.#ticker.stop()
      this.#resetMotion()
    }
  }

  getAttachment(name: string) {
    return this.#layers.find((layer) => layer.definition.attachmentId === name)?.container ?? null
  }

  destroy() {
    if (this.#destroyed) {
      return
    }

    this.#destroyed = true
    this.#ticker.destroy()

    for (const layer of this.#layers) {
      for (const motion of layer.motions) {
        for (const filter of motion.pixelPushFilters) {
          filter.destroy()
        }
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
      for (const motion of layer.motions) {
        if (motion.enabled) {
          this.#advanceMotion(layer, motion, deltaSeconds)
        }
      }
    }

    this.#onRender()
  }

  #advanceMotion(layer: LayerInstance, motion: MotionInstance, deltaSeconds: number) {
    const {state} = motion
    state.elapsedSeconds += deltaSeconds
    const travelProgress = Math.min(1, state.elapsedSeconds / state.travelSeconds)
    const easedProgress = (1 - Math.cos(travelProgress * Math.PI)) / 2
    const motionProgress = state.direction === 1 ? easedProgress : 1 - easedProgress

    if (motion.definition.kind === 'pivot-rotation') {
      layer.container.rotation =
        (motionProgress * (motion.definition.degrees * Math.PI)) / DEGREES_PER_HALF_TURN
    }

    for (const filter of motion.pixelPushFilters) {
      filter.setProgress(motionProgress)
    }

    if (travelProgress === 1) {
      state.direction = state.direction === 1 ? -1 : 1
      state.elapsedSeconds = 0
      state.travelSeconds = this.#randomDuration(motion.definition.travel)
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

  #createPushFilters(
    effects: readonly PixiScenePushEffect[],
    maskTextures: ReadonlyMap<string, Texture>,
  ) {
    const filters: PushFilter[] = []

    try {
      for (const effect of effects) {
        filters.push(this.#createPushFilter(effect, maskTextures))
      }

      return filters
    } catch (error: unknown) {
      for (const filter of filters) {
        filter.destroy()
      }

      throw error
    }
  }

  #createMotionInstances(
    motions: readonly PixiSceneMotion[],
    maskTextures: ReadonlyMap<string, Texture>,
  ) {
    const instances: MotionInstance[] = []

    try {
      for (const motion of motions) {
        instances.push({
          definition: motion,
          enabled: true,
          pixelPushFilters: this.#createPushFilters(getMotionEffects(motion), maskTextures),
          state: this.#createMotionState(motion.travel),
        })
      }

      return instances
    } catch (error: unknown) {
      for (const instance of instances) {
        for (const filter of instance.pixelPushFilters) {
          filter.destroy()
        }
      }

      throw error
    }
  }

  #validateDefinition() {
    if (this.#definition.width <= 0 || this.#definition.height <= 0) {
      throw new Error(`Invalid scene dimensions: ${this.#definition.id}`)
    }

    const attachments = new Set<string>()
    const layerIds = new Set<string>()

    for (const layer of this.#definition.layers) {
      if (layerIds.has(layer.id)) {
        throw new Error(`Duplicate layer id: ${layer.id}`)
      }

      layerIds.add(layer.id)

      if (layer.attachmentId !== undefined) {
        if (layer.attachmentId.length === 0) {
          throw new Error(`Empty layer attachment id: ${layer.id}`)
        }

        if (attachments.has(layer.attachmentId)) {
          throw new Error(`Duplicate layer attachment: ${layer.attachmentId}`)
        }

        attachments.add(layer.attachmentId)
      }

      if (layer.motion !== undefined && layer.motions !== undefined) {
        throw new Error(`Layer cannot define both motion and motions: ${layer.id}`)
      }

      const motions = getLayerMotions(layer)
      const pivotCount = motions.filter((motion) => motion.kind === 'pivot-rotation').length

      if (pivotCount > 1) {
        throw new Error(`Layer cannot define multiple pivot rotations: ${layer.id}`)
      }

      this.#validateMotions(layer.id, motions)
    }
  }

  #validateMotions(layerId: string, motions: readonly PixiSceneMotion[]) {
    for (const motion of motions) {
      const {travel} = motion

      if (travel.minimumSeconds <= 0 || travel.maximumSeconds < travel.minimumSeconds) {
        throw new Error(`Invalid motion travel range for layer: ${layerId}`)
      }

      if (motion.kind === 'pixel-oscillation' && motion.effects.length === 0) {
        throw new Error(`Pixel oscillation requires an effect: ${layerId}`)
      }

      for (const effect of getMotionEffects(motion)) {
        if (effect.kind === 'pixel-push' && !this.#isValidPixelPush(effect)) {
          throw new Error(`Invalid pixel-push region for layer: ${layerId}`)
        }
      }
    }
  }

  #isValidPixelPush(effect: PixiScenePixelPush) {
    const {region} = effect

    return (
      region.width > 0 &&
      region.height > 0 &&
      effect.featherPixels >= 0 &&
      region.x >= 0 &&
      region.y >= 0 &&
      region.x + region.width <= this.#definition.width &&
      region.y + region.height <= this.#definition.height
    )
  }

  #validateTextureSizes(textures: readonly TextureLease[], layerSourceCount: number) {
    for (const [index, lease] of textures.entries()) {
      const {height, width} = lease.texture

      if (width !== this.#definition.width || height !== this.#definition.height) {
        const sourceKind = index < layerSourceCount ? 'layer' : 'mask'
        throw new Error(
          `Invalid ${sourceKind} texture dimensions for ${lease.source}: ${width}x${height}`,
        )
      }
    }
  }

  #hasMotion() {
    return this.#layers.some((layer) => layer.motions.some((motion) => motion.enabled))
  }

  #randomDuration(range: PixiSceneTravelRange) {
    return range.minimumSeconds + this.#random() * (range.maximumSeconds - range.minimumSeconds)
  }

  #resetMotion() {
    for (const layer of this.#layers) {
      for (const motion of layer.motions) {
        this.#resetMotionInstance(layer, motion)
      }
    }
  }

  #resetMotionInstance(layer: LayerInstance, motion: MotionInstance) {
    motion.state.direction = 1
    motion.state.elapsedSeconds = 0
    motion.state.travelSeconds = this.#randomDuration(motion.definition.travel)

    if (motion.definition.kind === 'pivot-rotation') {
      layer.container.position.set(motion.definition.center.x, motion.definition.center.y)
      layer.container.rotation = 0
    }

    for (const filter of motion.pixelPushFilters) {
      filter.setProgress(0)
    }
  }
}
