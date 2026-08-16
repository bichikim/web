import {Application} from 'pixi.js'

import {PixiLayerScene, type PixiLayerSceneDefinition} from '../focus-room-animation/layer-scene'
import {createFocusRoomLayerState} from '../focus-room-animation/scene-layer-state'
import {FOCUS_ROOM_MOUTH_CHANNELS} from '../focus-room-animation/scene-catalog-channels'
import {FOCUS_ROOM_PREVIEW_CHANNELS} from '../focus-room-animation/scene-catalog'
import type {PViseme} from '../lip-sync'

export interface PLayerReviewState {
  readonly animationEnabled: boolean
  readonly eyesVisible: boolean
  readonly handsVisible: boolean
  readonly headVisible: boolean
  readonly mouthVisible: boolean
  readonly referenceOpacity: number
  readonly viseme: PViseme
}

export interface PLayerReviewRendererOptions {
  readonly definition: PixiLayerSceneDefinition
}

const clampOpacity = (value: number) => Math.min(1, Math.max(0, value))

export class PLayerReviewRenderer {
  readonly #application = new Application()
  readonly #initialDefinition: PixiLayerSceneDefinition
  readonly #host: HTMLDivElement
  #applicationReady = false
  #currentDefinitionId: string | null = null
  #destroyed = false
  #incomingDefinitionId: string | null = null
  #incomingScene: PixiLayerScene | null = null
  #replacementVersion = 0
  #scene: PixiLayerScene | null = null
  #state: PLayerReviewState | null = null

  constructor(host: HTMLDivElement, options: PLayerReviewRendererOptions) {
    this.#host = host
    this.#initialDefinition = options.definition
  }

  async initialize(state: PLayerReviewState) {
    this.#state = state
    await this.#application.init({
      antialias: false,
      autoStart: false,
      background: this.#initialDefinition.background,
      height: this.#initialDefinition.height,
      preference: 'webgl',
      resolution: 1,
      width: this.#initialDefinition.width,
    })
    this.#applicationReady = true

    if (this.#destroyed) {
      this.#application.destroy(true)
      this.#applicationReady = false
      return
    }

    this.#application.canvas.setAttribute('aria-hidden', 'true')
    this.#application.canvas.className =
      'absolute inset-0 block h-full w-full object-cover object-center'

    const scene = this.#createScene(this.#initialDefinition)
    this.#incomingScene = scene
    try {
      await scene.initialize(this.#toSceneState(state))
    } catch (error: unknown) {
      this.destroy()
      throw error
    }

    if (this.#destroyed) {
      return
    }

    this.#incomingScene = null
    this.#scene = scene
    this.#currentDefinitionId = this.#initialDefinition.id
    this.#application.stage.addChild(scene.container)
    const latestState = this.#state

    if (latestState !== null) {
      scene.update(this.#toSceneState(latestState))
    }

    this.#application.render()
    this.#host.append(this.#application.canvas)
  }

  update(state: PLayerReviewState) {
    this.#state = state
    this.#scene?.update(this.#toSceneState(state))
    this.#incomingScene?.update(this.#toSceneState(state))
  }

  async replaceDefinition(definition: PixiLayerSceneDefinition) {
    if (this.#destroyed || definition.id === this.#incomingDefinitionId) {
      return
    }

    if (definition.id === this.#currentDefinitionId) {
      this.#replacementVersion += 1
      this.#incomingDefinitionId = null
      this.#incomingScene = null
      return
    }

    const state = this.#state

    if (state === null) {
      return
    }

    const version = this.#replacementVersion + 1
    this.#replacementVersion = version
    const scene = this.#createScene(definition)
    this.#incomingDefinitionId = definition.id
    this.#incomingScene = scene

    try {
      await scene.initialize(this.#toSceneState(state))
    } catch (error: unknown) {
      if (this.#incomingScene === scene) {
        this.#incomingDefinitionId = null
        this.#incomingScene = null
      }

      if (!this.#destroyed && version === this.#replacementVersion) {
        throw error
      }

      return
    }

    if (this.#destroyed || version !== this.#replacementVersion) {
      scene.destroy()
      return
    }

    const previousScene = this.#scene
    this.#application.stage.addChild(scene.container)
    this.#scene = scene
    this.#incomingDefinitionId = null
    this.#incomingScene = null
    this.#currentDefinitionId = definition.id
    this.#application.render()
    previousScene?.destroy()
  }

  destroy() {
    if (this.#destroyed) {
      return
    }

    this.#destroyed = true
    this.#replacementVersion += 1
    this.#incomingDefinitionId = null
    this.#incomingScene?.destroy()
    this.#incomingScene = null
    this.#scene?.destroy()
    this.#scene = null
    this.#state = null

    if (this.#applicationReady) {
      this.#application.destroy(true)
      this.#applicationReady = false
    }
  }

  #createScene(definition: PixiLayerSceneDefinition) {
    return new PixiLayerScene(definition, {
      onRender: () => {
        if (!this.#destroyed && this.#applicationReady) {
          this.#application.render()
        }
      },
    })
  }

  #toSceneState(state: PLayerReviewState) {
    const referenceOpacity = clampOpacity(state.referenceOpacity)
    const mouthState = createFocusRoomLayerState(state.viseme, false)
    return {
      animationEnabled: state.animationEnabled,
      channels: {
        ...mouthState.channels,
        ...Object.fromEntries(
          Object.entries(FOCUS_ROOM_MOUTH_CHANNELS).map(([viseme, channel]) => [
            channel,
            {
              ...mouthState.channels?.[channel],
              visible: state.mouthVisible && viseme === state.viseme,
            },
          ]),
        ),
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
