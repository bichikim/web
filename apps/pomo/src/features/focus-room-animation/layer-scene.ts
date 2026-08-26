import {Container, type Texture, Ticker} from 'pixi.js'

import {positionLayerContainer} from './layer-layout'
import {applyLayerMask, clearLayerMask} from './layer-mask'
import {createLayerView} from './layer-view'
import {applyLoopingTranslation} from './looping-translation'
import {getLayerMotions, getMotionEffects} from './motion-definition'
import {resetMotionPresentation} from './motion-reset'
import {validateSceneMotions} from './motion-validation'
import {getMotionTarget, getNextMotionTarget} from './motion-targets'
import {applyOpacityPulse} from './opacity-pulse'
import {
  advanceSpriteOpacityTwinkle,
  applyOpacityTwinkle,
  createOpacityTwinkleState,
  type OpacityTwinkleState,
} from './opacity-twinkle'
import {createPushFilter, createPushFilters, type PushFilter} from './push-filter-factory'
import {acquireTextureGroup, releaseTextureGroup, type TextureLease} from './texture-leases'
import {validateTextureSizes} from './texture-size-validation'
import {applyVisibilityCycle} from './visibility-cycle'
import type {
  CreateStaticLayerSceneOptions,
  PixiLayerSceneDefinition,
  PixiLayerSceneState,
  PixiSceneLayerDefinition,
  PixiSceneMotion,
  PixiScenePoint,
  PixiSceneTravelRange,
} from './layer-scene-definition'

export type * from './layer-scene-definition'

export interface PixiLayerSceneOptions {
  readonly onRender: () => void
  readonly random?: () => number
}

interface MotionState {
  currentTarget: PixiScenePoint
  direction: 1 | -1
  elapsedSeconds: number
  nextTarget: PixiScenePoint
  travelSeconds: number
  twinkleState?: OpacityTwinkleState
}

interface LayerInstance {
  readonly container: Container
  readonly definition: PixiSceneLayerDefinition
  readonly motions: readonly MotionInstance[]
  readonly sprite: Container
  readonly statePixelPushFilter: PushFilter | null
}

interface MotionInstance {
  readonly definition: PixiSceneMotion
  enabled: boolean
  readonly pixelPushFilters: readonly PushFilter[]
  readonly state: MotionState
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
    const maskSources = this.#getMaskSources()
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
      validateTextureSizes(this.#definition, textures, layerSources.length)
      const maskTextures = new Map<string, Texture>(
        textures.slice(layerSources.length).map((lease) => [lease.source, lease.texture]),
      )

      for (const [index, definition] of this.#definition.layers.entries()) {
        const sprite = createLayerView(definition, textures[index].texture)
        const motions = getLayerMotions(definition)
        const pivotMotion = motions.find((motion) => motion.kind === 'pivot-rotation')
        const container = new Container()

        positionLayerContainer({
          container,
          pivotMotion,
          position: definition.position,
          rotationDegrees: definition.rotationDegrees,
          size: textures[index].texture,
        })

        const motionInstances = this.#createMotionInstances(
          motions,
          maskTextures,
          textures[index].texture,
        )
        const statePixelPushFilter =
          definition.statePixelPush === undefined
            ? null
            : createPushFilter(
                definition.statePixelPush.effect,
                maskTextures,
                textures[index].texture,
              )
        sprite.filters = [
          ...(statePixelPushFilter === null ? [] : [statePixelPushFilter]),
          ...motionInstances.flatMap((motion) => motion.pixelPushFilters),
        ]
        container.addChild(sprite)

        applyLayerMask(this.container, container, definition, maskTextures)
        this.container.addChild(container)
        layers.push({
          container,
          definition,
          motions: motionInstances,
          sprite,
          statePixelPushFilter,
        })
      }

      this.#attachChildLayers(layers)

      this.#initializeLayers(layers, state)
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
      this.#updateStatePixelPush(layer, state)

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

  #updateStatePixelPush(layer: LayerInstance, state: PixiLayerSceneState) {
    const statePixelPushChannel = layer.definition.statePixelPush?.channel
    const channelState =
      statePixelPushChannel === undefined ? undefined : state.channels?.[statePixelPushChannel]

    layer.statePixelPushFilter?.setProgress(clampUnit(channelState?.pixelPushProgress ?? 0))
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

  detachMasks() {
    this.#layers.forEach((layer) => clearLayerMask(layer.container))
  }

  destroy() {
    if (this.#destroyed) {
      return
    }

    this.#destroyed = true
    this.#ticker.destroy()
    this.detachMasks()

    for (const layer of this.#layers) {
      layer.statePixelPushFilter?.destroy()

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

    if (motion.definition.kind === 'opacity-twinkle') {
      advanceSpriteOpacityTwinkle({
        deltaSeconds,
        motion: motion.definition,
        random: this.#random,
        sprite: layer.sprite,
        state: state.twinkleState,
      })
      return
    }

    state.elapsedSeconds += deltaSeconds

    if (motion.definition.kind === 'visibility-cycle') {
      this.#advanceVisibilityCycle(layer, motion)
      return
    }

    if (motion.definition.kind === 'looping-translation') {
      this.#advanceLoopingTranslation(layer, motion)
      return
    }

    const travelProgress = Math.min(1, state.elapsedSeconds / state.travelSeconds)
    const transitionSeconds =
      motion.definition.kind === 'translation' || motion.definition.kind === 'opacity-pulse'
        ? motion.definition.transitionSeconds
        : undefined
    const transitionStart =
      transitionSeconds === undefined ? 0 : state.travelSeconds - transitionSeconds
    const activeProgress =
      transitionSeconds === undefined
        ? travelProgress
        : clampUnit((state.elapsedSeconds - transitionStart) / transitionSeconds)
    const easedProgress = (1 - Math.cos(activeProgress * Math.PI)) / 2
    const motionProgress = state.direction === 1 ? easedProgress : 1 - easedProgress

    if (motion.definition.kind === 'pivot-rotation') {
      layer.container.rotation =
        (motionProgress * (motion.definition.degrees * Math.PI)) / DEGREES_PER_HALF_TURN
    }

    if (motion.definition.kind === 'translation') {
      const {currentTarget, nextTarget} = state
      const x = currentTarget.x + (nextTarget.x - currentTarget.x) * easedProgress
      const y = currentTarget.y + (nextTarget.y - currentTarget.y) * easedProgress
      layer.container.position.set(x, y)
    }

    if (motion.definition.kind === 'opacity-pulse') {
      applyOpacityPulse(layer.sprite, motion.definition, motionProgress)
    }

    for (const filter of motion.pixelPushFilters) {
      filter.setProgress(motionProgress)
    }

    if (travelProgress === 1) {
      if (motion.definition.kind === 'translation' && 'targets' in motion.definition) {
        state.currentTarget = state.nextTarget
        state.nextTarget = getNextMotionTarget(
          motion.definition,
          state.currentTarget,
          state.direction,
          this.#random,
        )
      } else {
        state.direction = state.direction === 1 ? -1 : 1
        state.currentTarget = state.nextTarget
        state.nextTarget = getMotionTarget(motion.definition, state.direction)
      }
      state.elapsedSeconds = 0
      state.travelSeconds = this.#randomDuration(motion.definition.travel)
    }
  }

  #advanceLoopingTranslation(layer: LayerInstance, motion: MotionInstance) {
    const {state} = motion

    if (motion.definition.kind !== 'looping-translation') {
      return
    }

    const progress = Math.min(1, state.elapsedSeconds / state.travelSeconds)
    applyLoopingTranslation(layer.container, layer.sprite, motion.definition, progress)

    if (progress === 1) {
      state.elapsedSeconds = 0
      state.travelSeconds = this.#randomDuration(motion.definition.travel)
    }
  }

  #advanceVisibilityCycle(layer: LayerInstance, motion: MotionInstance) {
    const {state} = motion

    if (motion.definition.kind !== 'visibility-cycle') {
      return
    }

    if (state.elapsedSeconds >= state.travelSeconds) {
      state.elapsedSeconds %= state.travelSeconds
      state.travelSeconds = this.#randomDuration(motion.definition.travel)
    }

    applyVisibilityCycle(
      layer.sprite,
      motion.definition,
      state.elapsedSeconds / state.travelSeconds,
    )
  }

  #createMotionState(motion: PixiSceneMotion): MotionState {
    const currentTarget = getMotionTarget(motion, -1)
    const travelSeconds = this.#randomDuration(motion.travel)

    return {
      currentTarget,
      direction: 1,
      elapsedSeconds:
        motion.kind === 'looping-translation' ||
        motion.kind === 'opacity-pulse' ||
        motion.kind === 'visibility-cycle'
          ? (motion.phase ?? 0) * travelSeconds
          : 0,
      nextTarget: getNextMotionTarget(motion, currentTarget, 1, this.#random),
      travelSeconds,
      twinkleState:
        motion.kind === 'opacity-twinkle'
          ? createOpacityTwinkleState(motion, this.#random)
          : undefined,
    }
  }

  #initializeLayers(layers: readonly LayerInstance[], state: PixiLayerSceneState) {
    this.#layers = layers
    this.#resetMotion()
    this.update(state)
  }

  #getMaskSources() {
    return [
      ...new Set(
        this.#definition.layers.flatMap((layer) => [
          ...(layer.maskSource === undefined ? [] : [layer.maskSource]),
          ...(layer.statePixelPush?.effect.kind === 'masked-pixel-push'
            ? [layer.statePixelPush.effect.maskSource]
            : []),
          ...getLayerMotions(layer).flatMap((motion) =>
            getMotionEffects(motion).flatMap((effect) =>
              effect.kind === 'masked-pixel-push' ? [effect.maskSource] : [],
            ),
          ),
        ]),
      ),
    ]
  }

  #attachChildLayers(layers: readonly LayerInstance[]) {
    const attachments = new Map(
      layers.flatMap((layer) =>
        layer.definition.attachmentId === undefined
          ? []
          : [[layer.definition.attachmentId, layer.container] as const],
      ),
    )

    for (const layer of layers) {
      const {parentAttachmentId} = layer.definition

      if (parentAttachmentId !== undefined) {
        attachments.get(parentAttachmentId)?.addChild(layer.container)
      }
    }
  }

  #createMotionInstances(
    motions: readonly PixiSceneMotion[],
    maskTextures: ReadonlyMap<string, Texture>,
    layerTexture: Texture,
  ) {
    const instances: MotionInstance[] = []

    try {
      for (const motion of motions) {
        instances.push({
          definition: motion,
          enabled: true,
          pixelPushFilters: createPushFilters(getMotionEffects(motion), maskTextures, layerTexture),
          state: this.#createMotionState(motion),
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

      if (layer.repeat !== undefined && layer.position !== undefined) {
        throw new Error(`Repeated layer cannot define a position: ${layer.id}`)
      }

      if (layer.parentAttachmentId !== undefined && !attachments.has(layer.parentAttachmentId)) {
        throw new Error(`Missing parent layer attachment: ${layer.parentAttachmentId}`)
      }

      const motions = getLayerMotions(layer)
      const pivotCount = motions.filter((motion) => motion.kind === 'pivot-rotation').length

      if (pivotCount > 1) {
        throw new Error(`Layer cannot define multiple pivot rotations: ${layer.id}`)
      }

      validateSceneMotions(layer.id, motions, this.#definition)
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
    const currentTarget = getMotionTarget(motion.definition, -1)
    motion.state.direction = 1
    motion.state.elapsedSeconds = 0
    motion.state.currentTarget = currentTarget
    motion.state.nextTarget = getNextMotionTarget(motion.definition, currentTarget, 1, this.#random)
    motion.state.travelSeconds = this.#randomDuration(motion.definition.travel)
    motion.state.elapsedSeconds =
      motion.definition.kind === 'looping-translation' ||
      motion.definition.kind === 'opacity-pulse' ||
      motion.definition.kind === 'visibility-cycle'
        ? (motion.definition.phase ?? 0) * motion.state.travelSeconds
        : 0

    motion.state.twinkleState =
      motion.definition.kind === 'opacity-twinkle'
        ? createOpacityTwinkleState(motion.definition, this.#random)
        : undefined

    resetMotionPresentation({
      container: layer.container,
      currentTarget,
      motion: motion.definition,
      phase: motion.state.elapsedSeconds / motion.state.travelSeconds,
      sprite: layer.sprite,
    })

    if (motion.state.twinkleState !== undefined) {
      applyOpacityTwinkle(layer.sprite, motion.state.twinkleState)
    }

    for (const filter of motion.pixelPushFilters) {
      filter.setProgress(0)
    }
  }
}
