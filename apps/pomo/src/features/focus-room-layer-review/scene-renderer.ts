import {Application} from 'pixi.js'

import {
  DAY_WRITING_LAYER_CHANNELS,
  DAY_WRITING_LAYER_SCENE,
} from '../focus-room-animation/day-writing-layer-scene'
import {PixiLayerScene} from '../focus-room-animation/layer-scene'

export interface FocusRoomLayerReviewState {
  readonly animationEnabled: boolean
  readonly handsVisible: boolean
  readonly headVisible: boolean
  readonly referenceOpacity: number
}

const clampOpacity = (value: number) => Math.min(1, Math.max(0, value))

export class FocusRoomLayerReviewRenderer {
  readonly #application = new Application()
  readonly #host: HTMLDivElement
  #applicationReady = false
  #destroyed = false
  #scene: PixiLayerScene | null = null
  #state: FocusRoomLayerReviewState | null = null

  constructor(host: HTMLDivElement) {
    this.#host = host
  }

  async initialize(state: FocusRoomLayerReviewState) {
    this.#state = state
    await this.#application.init({
      antialias: false,
      autoStart: false,
      background: DAY_WRITING_LAYER_SCENE.background,
      height: DAY_WRITING_LAYER_SCENE.height,
      preference: 'webgl',
      resolution: 1,
      width: DAY_WRITING_LAYER_SCENE.width,
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

    const scene = new PixiLayerScene(DAY_WRITING_LAYER_SCENE, {
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
        [DAY_WRITING_LAYER_CHANNELS.hands]: {visible: state.handsVisible},
        [DAY_WRITING_LAYER_CHANNELS.head]: {visible: state.headVisible},
        [DAY_WRITING_LAYER_CHANNELS.reference]: {
          opacity: referenceOpacity,
          visible: referenceOpacity > 0,
        },
      },
    }
  }
}
