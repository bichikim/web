import {Application, Container, Sprite} from 'pixi.js'

import {DepthParallaxFilter} from './depth-parallax-filter'
import {PEyeController} from './eye-animation-controller'
import {ParallaxController} from './parallax-controller'
import {createSceneTransitions, SCENE_HEIGHT, SCENE_WIDTH} from './scene-composite-transition'
import {getPScenePanPosition} from './scene-motion'
import {
  destroySceneTree,
  isSceneSnapshotSafe,
  type PreparedScene,
  type StartPreparedTransitionOptions,
} from './scene-preparation'
import {SceneLoadingState} from './scene-loading-state'
import type {PSceneRendererOptions, PSceneState} from './scene-state'
import {createPSceneMouthController} from './scene-mouth-controller'
import {PSceneSteamController} from './scene-steam-controller'
import {PixiLayerScene, type PixiLayerSceneDefinition} from './layer-scene'
import {acquireTextureGroup, releaseTextureGroup, type TextureLease} from './texture-leases'

export type {PSceneMotionInput} from './scene-motion'
export type {PSceneState} from './scene-state'

const SCENE_TRANSITION_DURATION = 600
const DEPTH_PARALLAX_MAXIMUM_X = 9
const DEPTH_PARALLAX_MAXIMUM_Y = 6
const STEAM_PARALLAX_DEPTH = 0.55

const reportError = (error: unknown) => globalThis.reportError(error)

export class PSceneRenderer {
  readonly #application = new Application()
  readonly #eyes: PEyeController
  readonly #host: HTMLDivElement
  readonly #loading: SceneLoadingState
  readonly #mouth
  readonly #parallax: ParallaxController
  readonly #sceneLayer = new Container()
  readonly #sceneTransitions = createSceneTransitions(this.#application, this.#sceneLayer)
  readonly #steam: PSceneSteamController
  #applicationReady = false
  #currentDepthSource: string | null = null
  #currentLayerScene: PixiLayerScene | null = null
  #currentLayerSceneId: string | null = null
  #currentScene: Container | null = null
  #currentSceneSnapshotSafe = true
  #currentSource: string | null = null
  #currentTextures: readonly TextureLease[] = []
  #destroyed = false
  #depthFilter: DepthParallaxFilter | null = null
  #incomingLayerScene: PixiLayerScene | null = null
  #incomingLayerSceneId: string | null = null
  #incomingScene: Container | null = null
  #incomingSceneSnapshotSafe = true
  #incomingTextures: readonly TextureLease[] = []
  #initialized = false
  #motionPositionX = 0
  #motionPositionY = 0
  #requestedDepthSource: string | null = null
  #requestedLayerSceneId: string | null = null
  #requestedSource: string | null = null
  #state: PSceneState | null = null
  #transitionFrame: number | null = null
  #transitionVersion = 0

  constructor(host: HTMLDivElement, options: PSceneRendererOptions = {}) {
    this.#host = host
    this.#loading = new SceneLoadingState(options.onLoadingChange)
    this.#mouth = createPSceneMouthController(() => [
      this.#currentLayerScene,
      this.#incomingLayerScene,
    ])
    this.#eyes = new PEyeController(() => this.#application.render())
    this.#parallax = new ParallaxController(
      host,
      (x, y) => {
        this.#motionPositionX = x
        this.#motionPositionY = y
        this.#applySceneMotion()
        this.#application.render()
      },
      {
        onInputModeChange: options.onMotionInputChange,
        onMotionPreferenceChange: (prefersReducedMotion) =>
          this.#setReducedMotion(prefersReducedMotion),
      },
    )
    this.#steam = new PSceneSteamController({
      getPrefersReducedMotion: () => this.#parallax.prefersReducedMotion,
      onRender: () => this.#application.render(),
      stage: this.#application.stage,
    })
  }

  async initialize(state: PSceneState) {
    this.#loading.start()
    this.#state = state
    await this.#application.init({
      antialias: false,
      autoStart: false,
      backgroundAlpha: 0,
      height: SCENE_HEIGHT,
      preference: 'webgl',
      resolution: 1,
      width: SCENE_WIDTH,
    })
    this.#applicationReady = true

    if (this.#destroyed) {
      this.#application.destroy(true)
      this.#applicationReady = false
      return
    }

    this.#application.canvas.setAttribute('aria-hidden', 'true')
    this.#application.canvas.className =
      'absolute inset-0 h-full w-full object-cover object-[60%_center]'
    this.#host.append(this.#application.canvas)
    this.#application.stage.addChild(this.#sceneLayer)
    this.#sceneLayer.addChild(this.#eyes.container)

    try {
      await Promise.all([
        this.#loadInitialScene(state.source, state.depthSource, state.layerScene),
        this.#eyes.initialize(state),
        this.#steam.ensure(state.sceneStyle),
      ])
    } catch (error: unknown) {
      this.destroy()
      throw error
    }

    if (this.#destroyed) {
      return
    }

    this.#initialized = true
    const latestState = this.#state

    this.#steam.ensure(latestState?.sceneStyle).catch(reportError)
    this.#parallax.setInputMode(latestState?.motionInput ?? 'drag')
    this.#parallax.start()
    this.#steam.start()
    this.#eyes.setSceneReady(true)
    this.#application.render()
    this.#loading.finishAfterPaint()

    if (
      latestState !== null &&
      !this.#isCurrentScene(latestState.source, latestState.depthSource, latestState.layerScene)
    ) {
      this.#transitionTo(latestState.source, latestState.depthSource, latestState.layerScene).catch(
        reportError,
      )
    }
  }

  update(state: PSceneState) {
    const previousMotionInput = this.#state?.motionInput ?? 'drag'
    const previousMotionMode = this.#state?.motionMode ?? 'depth'
    const previousViseme = this.#state?.viseme ?? state.viseme
    this.#state = state
    this.#steam.setSceneStyle(state.sceneStyle)
    this.#eyes.update(state)

    this.#mouth.update(previousViseme, state.viseme, this.#parallax.prefersReducedMotion)

    if (this.#initialized) {
      this.#steam.ensure(state.sceneStyle).catch(reportError)

      if (previousMotionInput !== (state.motionInput ?? 'drag')) {
        this.#parallax.setInputMode(state.motionInput ?? 'drag')
      }

      if (previousMotionMode !== (state.motionMode ?? 'depth')) {
        this.#applySceneMotion()
        this.#application.render()
      }

      this.#syncScene(state.source, state.depthSource, state.layerScene)
    }
  }

  #applySceneMotion() {
    if ((this.#state?.motionMode ?? 'depth') === 'pan') {
      this.#depthFilter?.setPointerOffset(0, 0)
      this.#steam.setParallaxOffset(0, 0)
      this.#application.canvas.style.objectPosition = `${getPScenePanPosition(
        this.#motionPositionX,
      )}% center`
      return
    }

    const depthOffsetX = this.#motionPositionX * DEPTH_PARALLAX_MAXIMUM_X
    const depthOffsetY = this.#motionPositionY * DEPTH_PARALLAX_MAXIMUM_Y
    this.#application.canvas.style.objectPosition = `${getPScenePanPosition(0)}% center`
    this.#depthFilter?.setPointerOffset(depthOffsetX, depthOffsetY)
    this.#steam.setParallaxOffset(
      -depthOffsetX * STEAM_PARALLAX_DEPTH,
      -depthOffsetY * STEAM_PARALLAX_DEPTH,
    )
  }

  #syncScene(source: string, depthSource: string, layerScene: PixiLayerSceneDefinition | null) {
    if (!this.#isCurrentScene(source, depthSource, layerScene)) {
      this.#transitionTo(source, depthSource, layerScene).catch(reportError)
      return
    }

    if (this.#requestedSource !== null) {
      this.#transitionVersion += 1
      this.#requestedSource = null
      this.#requestedDepthSource = null
      this.#requestedLayerSceneId = null
      this.#cancelTransition()
      this.#eyes.setSceneReady(true)
      this.#application.render()
      this.#loading.finishAfterPaint()
    }
  }

  #setReducedMotion(prefersReducedMotion: boolean) {
    this.#currentLayerScene?.setAnimationEnabled(!prefersReducedMotion)
    this.#incomingLayerScene?.setAnimationEnabled(!prefersReducedMotion)
    this.#steam.setReducedMotion(prefersReducedMotion)

    this.#mouth.setReducedMotion(this.#state?.viseme ?? 'rest', prefersReducedMotion)

    const incomingScene = this.#incomingScene
    const requestedSource = this.#requestedSource
    const requestedDepthSource = this.#requestedDepthSource

    if (
      prefersReducedMotion &&
      incomingScene !== null &&
      requestedSource !== null &&
      requestedDepthSource !== null
    ) {
      if (this.#transitionFrame !== null) {
        window.cancelAnimationFrame(this.#transitionFrame)
      }

      this.#sceneTransitions.setProgress(1, this.#incomingScene)
      this.#depthFilter?.setDepthMix(1)
      this.#finishTransition(requestedSource, requestedDepthSource, incomingScene)
      return
    }

    this.#application.render()
  }

  destroy() {
    if (this.#destroyed) {
      return
    }

    this.#destroyed = true
    this.#transitionVersion += 1
    this.#cancelTransition()
    this.#mouth.destroy()
    this.#loading.destroy()
    this.#parallax.destroy()
    this.#sceneLayer.addChild(this.#eyes.container)
    this.#eyes.destroy()

    this.#destroyCurrentScene()
    this.#steam.destroy()
    this.#sceneLayer.filters = null
    this.#depthFilter?.destroy()
    this.#depthFilter = null
    this.#sceneLayer.destroy()

    if (this.#applicationReady) {
      this.#application.destroy(true)
      this.#applicationReady = false
    }

    releaseTextureGroup(this.#currentTextures)
    this.#currentTextures = []
  }

  async #loadInitialScene(
    source: string,
    depthSource: string,
    layerDefinition: PixiLayerSceneDefinition | null,
  ) {
    const prepared = await this.#prepareScene(source, depthSource, layerDefinition)

    if (prepared === null) {
      return
    }

    try {
      this.#addScene(prepared.scene, prepared.layerScene)
      this.#depthFilter = new DepthParallaxFilter(prepared.depthTexture)
    } catch (error: unknown) {
      this.#placeEyes(null)
      this.#destroyPreparedScene(prepared)
      throw error
    }

    this.#sceneLayer.filters = [this.#depthFilter]
    this.#currentDepthSource = depthSource
    this.#currentLayerScene = prepared.layerScene
    this.#currentLayerSceneId = layerDefinition?.id ?? null
    this.#currentScene = prepared.scene
    this.#currentSceneSnapshotSafe = prepared.snapshotSafe
    this.#currentSource = source
    this.#currentTextures = prepared.textures
  }

  async #transitionTo(
    source: string,
    depthSource: string,
    layerDefinition: PixiLayerSceneDefinition | null,
  ) {
    if (this.#isRequestedScene(source, depthSource, layerDefinition)) {
      return
    }

    const version = this.#transitionVersion + 1
    this.#loading.start()
    this.#transitionVersion = version
    this.#requestedSource = source
    this.#requestedDepthSource = depthSource
    this.#requestedLayerSceneId = layerDefinition?.id ?? null
    this.#eyes.setSceneReady(false)
    this.#cancelTransition()
    this.#application.render()

    try {
      const prepared = await this.#prepareScene(source, depthSource, layerDefinition)

      if (prepared === null) {
        return
      }

      if (version !== this.#transitionVersion) {
        this.#destroyPreparedScene(prepared)
        return
      }

      this.#startPreparedTransition({
        depthSource,
        layerSceneId: layerDefinition?.id ?? null,
        prepared,
        source,
        version,
      })
    } catch (error: unknown) {
      if (this.#destroyed || version !== this.#transitionVersion) {
        return
      }

      if (version === this.#transitionVersion) {
        this.#cancelTransition()
        this.#requestedSource = null
        this.#requestedDepthSource = null
        this.#requestedLayerSceneId = null
        this.#eyes.setSceneReady(this.#currentScene !== null)
        this.#loading.finish()
      }

      throw error
    }
  }

  #startPreparedTransition(options: StartPreparedTransitionOptions) {
    const {prepared} = options
    const useCompositeTransition = this.#currentSceneSnapshotSafe && prepared.snapshotSafe

    this.#sceneTransitions.capture(useCompositeTransition ? this.#currentScene : null)

    this.#incomingLayerScene = prepared.layerScene
    this.#incomingLayerSceneId = options.layerSceneId
    this.#incomingScene = prepared.scene
    this.#incomingSceneSnapshotSafe = prepared.snapshotSafe
    this.#incomingTextures = prepared.textures
    this.#depthFilter?.setDepthTransition(prepared.depthTexture)
    this.#addScene(prepared.scene, prepared.layerScene)
    this.#sceneTransitions.start(prepared.scene)
    this.#animateTransition(options.source, options.depthSource, prepared.scene, options.version)
  }

  #animateTransition(source: string, depthSource: string, scene: Container, version: number) {
    if (this.#parallax.prefersReducedMotion) {
      this.#sceneTransitions.setProgress(1, this.#incomingScene)
      this.#depthFilter?.setDepthMix(1)
      this.#application.render()
      this.#finishTransition(source, depthSource, scene)
      return
    }

    const startedAt = window.performance.now()
    const renderFrame = (timestamp: number) => {
      if (this.#destroyed || version !== this.#transitionVersion) {
        return
      }

      const progress = Math.min(1, (timestamp - startedAt) / SCENE_TRANSITION_DURATION)
      this.#sceneTransitions.setProgress(progress, this.#incomingScene)
      this.#depthFilter?.setDepthMix(progress)
      this.#application.render()

      if (progress < 1) {
        this.#transitionFrame = window.requestAnimationFrame(renderFrame)
        return
      }

      this.#finishTransition(source, depthSource, scene)
    }

    this.#transitionFrame = window.requestAnimationFrame(renderFrame)
  }

  #finishTransition(source: string, depthSource: string, scene: Container) {
    const previousLayerScene = this.#currentLayerScene
    const previousScene = this.#currentScene
    const previousTextures = this.#currentTextures
    this.#sceneTransitions.restore()
    previousScene?.removeFromParent()
    this.#currentScene = scene
    this.#currentSceneSnapshotSafe = this.#incomingSceneSnapshotSafe
    this.#currentLayerScene = this.#incomingLayerScene
    this.#currentLayerSceneId = this.#incomingLayerSceneId
    this.#currentSource = source
    this.#currentDepthSource = depthSource
    this.#currentTextures = this.#incomingTextures
    this.#incomingScene = null
    this.#incomingSceneSnapshotSafe = true
    this.#incomingLayerScene = null
    this.#incomingLayerSceneId = null
    this.#incomingTextures = []
    this.#requestedSource = null
    this.#requestedDepthSource = null
    this.#requestedLayerSceneId = null
    this.#transitionFrame = null
    this.#eyes.setSceneReady(true)
    this.#depthFilter?.finishDepthTransition()
    destroySceneTree(previousScene, previousLayerScene)
    releaseTextureGroup(previousTextures)
    this.#application.render()
    this.#loading.finishAfterPaint()
  }

  #cancelTransition() {
    if (this.#transitionFrame !== null) {
      window.cancelAnimationFrame(this.#transitionFrame)
      this.#transitionFrame = null
    }

    this.#placeEyes(this.#currentLayerScene)
    this.#sceneTransitions.restore()
    this.#destroyIncomingScene()
    this.#incomingScene = null
    this.#incomingSceneSnapshotSafe = true
    this.#depthFilter?.cancelDepthTransition()
    releaseTextureGroup(this.#incomingTextures)
    this.#incomingTextures = []
  }

  async #createLayerScene(definition: PixiLayerSceneDefinition | null) {
    if (definition === null) {
      return null
    }

    const layerScene = new PixiLayerScene(definition, {
      onRender: () => {
        if (!this.#destroyed) {
          this.#application.render()
        }
      },
    })

    try {
      await layerScene.initialize(
        this.#mouth.getLayerState(
          this.#state?.viseme ?? 'rest',
          this.#parallax.prefersReducedMotion,
        ),
      )
    } catch (error: unknown) {
      layerScene.destroy()
      throw error
    }

    return layerScene
  }

  async #prepareScene(
    source: string,
    depthSource: string,
    definition: PixiLayerSceneDefinition | null,
  ): Promise<PreparedScene | null> {
    const textures = await acquireTextureGroup(
      definition === null ? [source, depthSource] : [depthSource],
    )

    try {
      const layerScene = await this.#createLayerScene(definition)

      if (this.#destroyed) {
        layerScene?.destroy()
        releaseTextureGroup(textures)
        return null
      }

      return {
        depthTexture: textures[definition === null ? 1 : 0].texture,
        layerScene,
        scene: layerScene?.container ?? new Sprite(textures[0].texture),
        snapshotSafe: isSceneSnapshotSafe(definition),
        textures,
      }
    } catch (error: unknown) {
      releaseTextureGroup(textures)
      throw error
    }
  }

  #destroyPreparedScene(prepared: PreparedScene) {
    if (prepared.layerScene === null) {
      prepared.scene.destroy()
    } else {
      prepared.layerScene.destroy()
    }

    releaseTextureGroup(prepared.textures)
  }

  #addScene(scene: Container, layerScene: PixiLayerScene | null) {
    this.#sceneLayer.addChild(scene)
    this.#placeEyes(layerScene)
  }

  #placeEyes(layerScene: PixiLayerScene | null) {
    // A scene attachment lets blink pixels inherit head motion without sharing coordinates.
    const parent = layerScene?.getAttachment('eyes') ?? this.#sceneLayer
    parent.addChild(this.#eyes.container)
  }

  #destroyCurrentScene() {
    this.#currentLayerScene?.detachMasks()
    this.#currentScene?.removeFromParent()

    destroySceneTree(this.#currentScene, this.#currentLayerScene)

    this.#currentScene = null
    this.#currentSceneSnapshotSafe = true
    this.#currentLayerScene = null
    this.#currentLayerSceneId = null
  }

  #destroyIncomingScene() {
    this.#incomingLayerScene?.detachMasks()
    this.#incomingScene?.removeFromParent()

    destroySceneTree(this.#incomingScene, this.#incomingLayerScene)

    this.#incomingScene = null
    this.#incomingSceneSnapshotSafe = true
    this.#incomingLayerScene = null
    this.#incomingLayerSceneId = null
  }

  #isCurrentScene(
    source: string,
    depthSource: string,
    layerScene: PixiLayerSceneDefinition | null,
  ) {
    return (
      source === this.#currentSource &&
      depthSource === this.#currentDepthSource &&
      (layerScene?.id ?? null) === this.#currentLayerSceneId
    )
  }

  #isRequestedScene(
    source: string,
    depthSource: string,
    layerScene: PixiLayerSceneDefinition | null,
  ) {
    return (
      source === this.#requestedSource &&
      depthSource === this.#requestedDepthSource &&
      (layerScene?.id ?? null) === this.#requestedLayerSceneId
    )
  }
}
