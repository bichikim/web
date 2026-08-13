import {Application} from 'pixi.js'

import {PixiLayerScene, type PixiLayerSceneDefinition} from '../focus-room-animation/layer-scene'
import {FOCUS_ROOM_PREVIEW_CHANNELS} from '../focus-room-animation/scene-catalog'

export interface FocusRoomLayerReviewState {
  readonly animationEnabled: boolean
  readonly eyesVisible: boolean
  readonly handsVisible: boolean
  readonly headVisible: boolean
  readonly referenceOpacity: number
}

export interface FocusRoomLayerReviewRendererOptions {
  readonly definition: PixiLayerSceneDefinition
}

const clampOpacity = (value: number) => Math.min(1, Math.max(0, value))

export class FocusRoomLayerReviewRenderer {
  readonly #application = new Application()
  readonly #definition: PixiLayerSceneDefinition
  readonly #host: HTMLDivElement
  #applicationReady = false
  #destroyed = false
  #scene: PixiLayerScene | null = null
  #state: FocusRoomLayerReviewState | null = null

  constructor(host: HTMLDivElement, options: FocusRoomLayerReviewRendererOptions) {
    this.#host = host
    this.#definition = options.definition
  }

  async initialize(state: FocusRoomLayerReviewState) {
    this.#state = state
    await this.#application.init({
      antialias: false,
      autoStart: false,
      background: this.#definition.background,
      height: this.#definition.height,
      preference: 'webgl',
      resolution: 1,
      width: this.#definition.width,
    })
    this.#applicationReady = true

    if (this.#destroyed) {
      this.#application.destroy(true)
      this.#applicationReady = false
      return
    }

    this.#application.canvas.setAttribute('aria-hidden', 'true')
    this.#application.canvas.className = 'block h-full w-full object-cover object-center'
    this.#host.append(this.#application.canvas)

    const scene = new PixiLayerScene(this.#definition, {
      onRender: () => this.#application.render(),
    })
    this.#scene = scene
    this.#application.stage.addChild(scene.container)
    try {
      await scene.initialize(this.#toSceneState(state))
    } catch (error: unknown) {
      this.destroy()
      throw error
    }

    if (this.#destroyed) {
      return
    }

    const latestState = this.#state

    if (latestState !== null) {
      scene.update(this.#toSceneState(latestState))
    }

    this.#application.render()
  }

  update(state: FocusRoomLayerReviewState) {
    this.#state = state
    this.#scene?.update(this.#toSceneState(state))
  }

  destroy() {
    if (this.#destroyed) {
      return
    }

    this.#destroyed = true
    this.#scene?.destroy()
    this.#scene = null
    this.#state = null

    if (this.#applicationReady) {
      this.#application.destroy(true)
      this.#applicationReady = false
    }
  }

  #toSceneState(state: FocusRoomLayerReviewState) {
    const referenceOpacity = clampOpacity(state.referenceOpacity)
    return {
      animationEnabled: state.animationEnabled,
      channels: {
        [FOCUS_ROOM_PREVIEW_CHANNELS.eyes]: {visible: state.eyesVisible},
        [FOCUS_ROOM_PREVIEW_CHANNELS.hands]: {visible: state.handsVisible},
        [FOCUS_ROOM_PREVIEW_CHANNELS.head]: {visible: state.headVisible},
        [FOCUS_ROOM_PREVIEW_CHANNELS.reference]: {
          opacity: referenceOpacity,
          visible: referenceOpacity > 0,
        },
      },
    }
  }
}
