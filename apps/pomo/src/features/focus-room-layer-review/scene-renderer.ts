import 'pixi.js/unsafe-eval'
import {Application} from 'pixi.js'

import {
  PEyeController,
  type PEyeMode,
  type PEyeState,
} from '../focus-room-animation/eye-animation-controller'
import {PixiLayerScene, type PixiLayerSceneDefinition} from '../focus-room-animation/layer-scene'
import {createPMouthTransitionController} from '../focus-room-animation/mouth-transition-controller'
import {createFocusRoomLayerState} from '../focus-room-animation/scene-layer-state'
import {
  FOCUS_ROOM_MOUTH_CHANNELS,
  FOCUS_ROOM_MOUTH_TRANSITION_CHANNELS,
  type PMouthTransitionStage,
} from '../focus-room-animation/scene-catalog-channels'
import {FOCUS_ROOM_PREVIEW_CHANNELS} from '../focus-room-animation/scene-catalog'
import type {PViseme} from '../lip-sync'

export type PReviewMouthFrame = PMouthTransitionStage | PViseme

export interface PLayerReviewState extends PEyeState {
  readonly animationEnabled: boolean
  readonly eyeMode: PEyeMode
  readonly eyesVisible: boolean
  readonly handsVisible: boolean
  readonly headVisible: boolean
  readonly mouthFrame: PReviewMouthFrame | null
  readonly mouthPositionComparison: boolean
  readonly mouthVisible: boolean
  readonly referenceOpacity: number
  readonly viseme: PViseme
}

export interface PLayerReviewRendererOptions {
  readonly definition: PixiLayerSceneDefinition
}

const clampOpacity = (value: number) => Math.min(1, Math.max(0, value))
const COMPARISON_MOUTH_OPACITY = 0.5
const MOUTH_CHANNELS = [
  ...Object.values(FOCUS_ROOM_MOUTH_CHANNELS),
  ...Object.values(FOCUS_ROOM_MOUTH_TRANSITION_CHANNELS),
]

export class PLayerReviewRenderer {
  readonly #application = new Application()
  readonly #eyes: PEyeController
  readonly #initialDefinition: PixiLayerSceneDefinition
  readonly #host: HTMLDivElement
  readonly #mouthTransition = createPMouthTransitionController(() => this.#syncScenes())
  #applicationReady = false
  #currentDefinitionId: string | null = null
  #destroyed = false
  #incomingDefinitionId: string | null = null
  #incomingScene: PixiLayerScene | null = null
  #pendingDefinition: PixiLayerSceneDefinition | null = null
  #replacementVersion = 0
  #scene: PixiLayerScene | null = null
  #state: PLayerReviewState | null = null

  constructor(host: HTMLDivElement, options: PLayerReviewRendererOptions) {
    this.#host = host
    this.#initialDefinition = options.definition
    this.#eyes = new PEyeController(() => this.#application.render())
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
    this.#host.append(this.#application.canvas)
    await this.#initializeFirstScene(state)
  }

  async #initializeFirstScene(state: PLayerReviewState) {
    const definition = this.#pendingDefinition ?? this.#initialDefinition
    const version = this.#replacementVersion
    const scene = this.#createScene(definition)
    this.#pendingDefinition = null
    this.#incomingDefinitionId = definition.id
    this.#incomingScene = scene
    const [sceneInitialization, eyeInitialization] = await Promise.allSettled([
      scene.initialize(this.#toSceneState(state)),
      this.#eyes.initialize(state),
    ])

    if (eyeInitialization.status === 'rejected') {
      scene.destroy()
      this.destroy()
      throw eyeInitialization.reason
    }

    if (sceneInitialization.status === 'rejected') {
      if (version !== this.#replacementVersion) {
        scene.destroy()
        return
      }

      this.destroy()
      throw sceneInitialization.reason
    }

    if (this.#destroyed) {
      return
    }

    if (version !== this.#replacementVersion) {
      scene.destroy()
      return
    }

    this.#incomingScene = null
    this.#incomingDefinitionId = null
    this.#scene = scene
    this.#currentDefinitionId = definition.id
    this.#application.stage.addChild(scene.container)
    this.#placeEyes(scene)
    const latestState = this.#state!
    this.#eyes.setMode(latestState.eyeMode)
    this.#eyes.update(latestState)
    this.#syncEyes(latestState)
    scene.update(this.#toSceneState(latestState))

    this.#eyes.setSceneReady(true)
    this.#application.render()
  }

  update(state: PLayerReviewState) {
    const previousState = this.#state
    const previousViseme = previousState?.viseme ?? state.viseme
    this.#state = state
    this.#eyes.setMode(state.eyeMode)
    this.#eyes.update(state)
    this.#syncEyes(state)

    if (state.mouthFrame !== null || previousState?.mouthFrame !== null) {
      this.#mouthTransition.cancel()
      this.#syncScenes()
      return
    }

    if (previousViseme !== state.viseme) {
      this.#mouthTransition.start(previousViseme, state.viseme, false)
      return
    }

    this.#syncScenes()
  }

  async replaceDefinition(definition: PixiLayerSceneDefinition) {
    if (this.#destroyed) {
      return
    }

    if (!this.#applicationReady) {
      this.#replacementVersion += 1
      this.#pendingDefinition = definition
      return
    }

    if (definition.id === this.#incomingDefinitionId) {
      return
    }

    if (definition.id === this.#currentDefinitionId) {
      this.#replacementVersion += 1
      this.#incomingDefinitionId = null
      this.#incomingScene = null
      this.#eyes.setSceneReady(true)
      return
    }

    await this.#replaceReadyDefinition(definition)
  }

  async #replaceReadyDefinition(definition: PixiLayerSceneDefinition) {
    const state = this.#state!

    const version = this.#replacementVersion + 1
    this.#replacementVersion = version
    this.#eyes.setSceneReady(false)
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
        this.#eyes.setSceneReady(this.#scene !== null)
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
    this.#placeEyes(scene)
    this.#scene = scene
    this.#incomingDefinitionId = null
    this.#incomingScene = null
    this.#currentDefinitionId = definition.id
    this.#eyes.setSceneReady(true)
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
    this.#pendingDefinition = null
    this.#incomingScene?.destroy()
    this.#incomingScene = null
    this.#eyes.container.removeFromParent()
    this.#eyes.destroy()
    this.#mouthTransition.destroy()
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

  #placeEyes(scene: PixiLayerScene) {
    const parent = scene.getAttachment('eyes') ?? this.#application.stage
    parent.addChild(this.#eyes.container)
  }

  #syncEyes(state: PLayerReviewState) {
    this.#eyes.container.visible = state.eyesVisible
  }

  #syncScenes() {
    const state = this.#state

    if (state === null) {
      return
    }

    const sceneState = this.#toSceneState(state)
    this.#scene?.update(sceneState)
    this.#incomingScene?.update(sceneState)
  }

  #toSceneState(state: PLayerReviewState) {
    const referenceOpacity = clampOpacity(state.referenceOpacity)
    const mouthState = createFocusRoomLayerState(
      state.viseme,
      false,
      this.#mouthTransition.current ?? undefined,
    )
    const fixedMouthChannel =
      state.mouthFrame === null
        ? null
        : ((FOCUS_ROOM_MOUTH_CHANNELS as Readonly<Partial<Record<PReviewMouthFrame, string>>>)[
            state.mouthFrame
          ] ?? FOCUS_ROOM_MOUTH_TRANSITION_CHANNELS[state.mouthFrame as PMouthTransitionStage])
    const restMouthChannel = FOCUS_ROOM_MOUTH_CHANNELS.rest
    const mouthPositionComparison =
      state.mouthPositionComparison &&
      fixedMouthChannel !== null &&
      fixedMouthChannel !== restMouthChannel

    return {
      animationEnabled: state.animationEnabled,
      channels: {
        ...mouthState.channels,
        ...Object.fromEntries(
          MOUTH_CHANNELS.map((channel) => [
            channel,
            {
              ...mouthState.channels?.[channel],
              opacity:
                fixedMouthChannel === null
                  ? mouthState.channels?.[channel]?.opacity
                  : mouthPositionComparison && channel === fixedMouthChannel
                    ? COMPARISON_MOUTH_OPACITY
                    : 1,
              visible:
                state.mouthVisible &&
                (fixedMouthChannel === null
                  ? mouthState.channels?.[channel]?.visible === true
                  : channel === fixedMouthChannel ||
                    (mouthPositionComparison && channel === restMouthChannel)),
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
