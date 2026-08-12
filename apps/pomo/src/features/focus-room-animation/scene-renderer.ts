import {Application, Container, Sprite, type Texture} from 'pixi.js'

import dayFocusedClosedImage from '../../../assets/focus-room-animation/eyes-day-focused-closed.png'
import dayFocusedHalfImage from '../../../assets/focus-room-animation/eyes-day-focused-half.png'
import dayUserClosedImage from '../../../assets/focus-room-animation/eyes-day-user-closed.png'
import dayUserHalfImage from '../../../assets/focus-room-animation/eyes-day-user-half.png'
import nightFocusedClosedImage from '../../../assets/focus-room-animation/eyes-night-focused-closed.png'
import nightFocusedHalfImage from '../../../assets/focus-room-animation/eyes-night-focused-half.png'
import nightUserClosedImage from '../../../assets/focus-room-animation/eyes-night-user-closed.png'
import nightUserHalfImage from '../../../assets/focus-room-animation/eyes-night-user-half.png'
import steamImage1 from '../../../assets/focus-room-animation/steam-ai-1.png'
import steamImage2 from '../../../assets/focus-room-animation/steam-ai-2.png'
import steamImage3 from '../../../assets/focus-room-animation/steam-ai-3.png'
import steamImage4 from '../../../assets/focus-room-animation/steam-ai-4.png'
import {type BlinkScheduler, createBlinkScheduler} from './blink-scheduler'
import {DepthParallaxFilter} from './depth-parallax-filter'
import {ParallaxController} from './parallax-controller'
import {SteamParticleSystem} from './steam-particle-system'
import {acquireTextureGroup, releaseTextureGroup, type TextureLease} from './texture-leases'

export type FocusRoomActivity = 'reading' | 'typing' | 'writing'
export type FocusRoomGaze = 'focused' | 'user'
export type FocusRoomTime = 'day' | 'night'

export interface FocusRoomSceneState {
  readonly activity: FocusRoomActivity
  readonly depthSource: string
  readonly gaze: FocusRoomGaze
  readonly source: string
  readonly time: FocusRoomTime
}

export interface FocusRoomSceneRendererOptions {
  readonly onLoadingChange?: (isLoading: boolean) => void
}

interface EyeAsset {
  readonly closed: string
  readonly half: string
  readonly left: number
  readonly top: number
}

type EyeState = 'closed' | 'half' | 'open'
type EyeTextures = Record<FocusRoomTime, Record<FocusRoomGaze, Record<'closed' | 'half', Texture>>>

const EYE_ASSETS = {
  day: {
    focused: {
      closed: dayFocusedClosedImage,
      half: dayFocusedHalfImage,
      left: 850,
      top: 250,
    },
    user: {
      closed: dayUserClosedImage,
      half: dayUserHalfImage,
      left: 850,
      top: 212,
    },
  },
  night: {
    focused: {
      closed: nightFocusedClosedImage,
      half: nightFocusedHalfImage,
      left: 850,
      top: 250,
    },
    user: {
      closed: nightUserClosedImage,
      half: nightUserHalfImage,
      left: 842,
      top: 206,
    },
  },
} satisfies Record<FocusRoomTime, Record<FocusRoomGaze, EyeAsset>>

const HALF_FRAME_DURATION = 48
const CLOSED_FRAME_DURATION = 72
const SCENE_TRANSITION_DURATION = 600
const STEAM_PARALLAX_DEPTH = 0.55
const EYE_SOURCES = [
  dayFocusedHalfImage,
  dayFocusedClosedImage,
  dayUserHalfImage,
  dayUserClosedImage,
  nightFocusedHalfImage,
  nightFocusedClosedImage,
  nightUserHalfImage,
  nightUserClosedImage,
] as const
const STEAM_SOURCES = [steamImage1, steamImage2, steamImage3, steamImage4] as const
const EYE_OFFSETS = {
  day: {
    focused: {
      reading: {x: 0, y: 0},
      typing: {x: -2, y: 0},
      writing: {x: 0, y: 0},
    },
    user: {
      reading: {x: 0, y: 0},
      typing: {x: 0, y: 0},
      writing: {x: 0, y: 0},
    },
  },
  night: {
    focused: {
      reading: {x: 4, y: 0},
      typing: {x: -1, y: 0},
      writing: {x: 0, y: 0},
    },
    user: {
      reading: {x: -11, y: -5},
      typing: {x: 0, y: 0},
      writing: {x: 0, y: 0},
    },
  },
} satisfies Record<
  FocusRoomTime,
  Record<FocusRoomGaze, Record<FocusRoomActivity, {readonly x: number; readonly y: number}>>
>

const wait = (duration: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, duration)
  })

const reportError = (error: unknown) => {
  globalThis.reportError(error)
}

const ignoreLoadingChange = () => undefined

export class FocusRoomSceneRenderer {
  readonly #application = new Application()
  readonly #host: HTMLDivElement
  readonly #onLoadingChange: (isLoading: boolean) => void
  readonly #parallax: ParallaxController
  readonly #sceneLayer = new Container()
  #applicationReady = false
  #currentDepthSource: string | null = null
  #currentScene: Sprite | null = null
  #currentSource: string | null = null
  #currentTextures: readonly TextureLease[] = []
  #destroyed = false
  #depthFilter: DepthParallaxFilter | null = null
  #eyeSequence = 0
  #eyeSprite: Sprite | null = null
  #eyeTextures: EyeTextures | null = null
  #eyeTextureLeases: readonly TextureLease[] = []
  #incomingScene: Sprite | null = null
  #incomingTextures: readonly TextureLease[] = []
  #initialized = false
  #requestedDepthSource: string | null = null
  #requestedSource: string | null = null
  #sceneReady = false
  #settledFrame: number | null = null
  #scheduler: BlinkScheduler | null = null
  #state: FocusRoomSceneState | null = null
  #steam: SteamParticleSystem | null = null
  #steamTextureLeases: readonly TextureLease[] = []
  #transitionFrame: number | null = null
  #transitionVersion = 0

  constructor(host: HTMLDivElement, options: FocusRoomSceneRendererOptions = {}) {
    this.#host = host
    this.#onLoadingChange = options.onLoadingChange ?? ignoreLoadingChange
    this.#parallax = new ParallaxController(host, (x, y) => {
      this.#depthFilter?.setPointerOffset(x, y)
      this.#steam?.setParallaxOffset(-x * STEAM_PARALLAX_DEPTH, -y * STEAM_PARALLAX_DEPTH)
      this.#application.render()
    })
  }

  async initialize(state: FocusRoomSceneState) {
    this.#startLoading()
    this.#state = state
    await this.#application.init({
      antialias: false,
      autoStart: false,
      backgroundAlpha: 0,
      height: 941,
      preference: 'webgl',
      resolution: 1,
      width: 1672,
    })
    this.#applicationReady = true

    if (this.#destroyed) {
      this.#application.destroy(true)
      this.#applicationReady = false
      return
    }

    this.#application.stage.sortableChildren = true
    this.#application.stage.addChild(this.#sceneLayer)
    this.#application.canvas.setAttribute('aria-hidden', 'true')
    this.#application.canvas.className =
      'pomo-scene-media absolute inset-0 h-full w-full object-cover'
    this.#host.append(this.#application.canvas)

    try {
      await Promise.all([
        this.#loadInitialScene(state.source, state.depthSource),
        this.#loadEyes(),
        this.#loadSteam(),
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

    this.#parallax.start()
    this.#steam?.start()
    this.#application.render()
    this.#finishLoadingAfterPaint()

    if (
      latestState !== null &&
      !this.#isCurrentScene(latestState.source, latestState.depthSource)
    ) {
      this.#transitionTo(latestState.source, latestState.depthSource).catch(reportError)
    }
  }

  update(state: FocusRoomSceneState) {
    this.#state = state
    this.#eyeSequence += 1
    this.#renderEye('open')

    if (this.#initialized) {
      this.#syncScene(state.source, state.depthSource)
    }

    this.#scheduler?.start()
  }

  #syncScene(source: string, depthSource: string) {
    if (!this.#isCurrentScene(source, depthSource)) {
      this.#transitionTo(source, depthSource).catch(reportError)
      return
    }

    if (this.#requestedSource !== null) {
      this.#transitionVersion += 1
      this.#requestedSource = null
      this.#requestedDepthSource = null
      this.#cancelTransition()
      this.#sceneReady = true
      this.#application.render()
      this.#finishLoadingAfterPaint()
    }
  }

  destroy() {
    if (this.#destroyed) {
      return
    }

    this.#destroyed = true
    this.#transitionVersion += 1
    this.#eyeSequence += 1
    this.#cancelTransition()
    this.#cancelSettledFrame()
    this.#parallax.destroy()
    this.#scheduler?.destroy()
    this.#scheduler = null

    this.#currentScene?.removeFromParent()
    this.#currentScene?.destroy()
    this.#eyeSprite?.removeFromParent()
    this.#eyeSprite?.destroy()
    this.#eyeSprite = null
    this.#steam?.destroy()
    this.#sceneLayer.filters = null
    this.#depthFilter?.destroy()
    this.#depthFilter = null
    this.#sceneLayer.destroy()

    if (this.#applicationReady) {
      this.#application.destroy(true)
      this.#applicationReady = false
    }

    releaseTextureGroup(this.#currentTextures)
    releaseTextureGroup(this.#eyeTextureLeases)
    releaseTextureGroup(this.#steamTextureLeases)
    this.#currentTextures = []
    this.#eyeTextureLeases = []
    this.#steamTextureLeases = []
    this.#eyeTextures = null
  }

  async #loadInitialScene(source: string, depthSource: string) {
    const textures = await acquireTextureGroup([source, depthSource])

    if (this.#destroyed) {
      releaseTextureGroup(textures)
      return
    }

    const sprite = new Sprite(textures[0].texture)
    this.#sceneLayer.addChild(sprite)
    this.#depthFilter = new DepthParallaxFilter(textures[1].texture)
    this.#sceneLayer.filters = [this.#depthFilter]
    this.#currentDepthSource = depthSource
    this.#currentScene = sprite
    this.#currentSource = source
    this.#currentTextures = textures
    this.#sceneReady = true
  }

  async #loadEyes() {
    const [
      dayFocusedHalf,
      dayFocusedClosed,
      dayUserHalf,
      dayUserClosed,
      nightFocusedHalf,
      nightFocusedClosed,
      nightUserHalf,
      nightUserClosed,
    ] = await acquireTextureGroup(EYE_SOURCES)

    if (this.#destroyed) {
      releaseTextureGroup([
        dayFocusedHalf,
        dayFocusedClosed,
        dayUserHalf,
        dayUserClosed,
        nightFocusedHalf,
        nightFocusedClosed,
        nightUserHalf,
        nightUserClosed,
      ])
      return
    }

    this.#eyeTextureLeases = [
      dayFocusedHalf,
      dayFocusedClosed,
      dayUserHalf,
      dayUserClosed,
      nightFocusedHalf,
      nightFocusedClosed,
      nightUserHalf,
      nightUserClosed,
    ]
    this.#eyeSprite = new Sprite(dayFocusedHalf.texture)
    this.#eyeSprite.visible = false
    this.#eyeSprite.zIndex = 2
    this.#sceneLayer.addChild(this.#eyeSprite)
    this.#eyeTextures = {
      day: {
        focused: {closed: dayFocusedClosed.texture, half: dayFocusedHalf.texture},
        user: {closed: dayUserClosed.texture, half: dayUserHalf.texture},
      },
      night: {
        focused: {closed: nightFocusedClosed.texture, half: nightFocusedHalf.texture},
        user: {closed: nightUserClosed.texture, half: nightUserHalf.texture},
      },
    }
    this.#scheduler = createBlinkScheduler({
      maximumDelay: 6_000,
      minimumDelay: 2_000,
      onBlink: () => this.#playBlink(),
    })
    this.#scheduler.start()
  }

  async #loadSteam() {
    const textures = await acquireTextureGroup(STEAM_SOURCES)

    if (this.#destroyed) {
      releaseTextureGroup(textures)
      return
    }

    this.#steamTextureLeases = textures
    this.#steam = new SteamParticleSystem({
      onRender: () => this.#application.render(),
      prefersReducedMotion: this.#parallax.prefersReducedMotion,
      textures: textures.map((lease) => lease.texture),
    })
    this.#application.stage.addChild(this.#steam.container)
  }

  #renderEye(state: EyeState) {
    const sceneState = this.#state

    if (this.#eyeSprite === null || this.#eyeTextures === null || sceneState === null) {
      return
    }

    if (state === 'open') {
      this.#eyeSprite.visible = false
    } else {
      const asset = EYE_ASSETS[sceneState.time][sceneState.gaze]
      const offset = EYE_OFFSETS[sceneState.time][sceneState.gaze][sceneState.activity]

      this.#eyeSprite.texture = this.#eyeTextures[sceneState.time][sceneState.gaze][state]
      this.#eyeSprite.position.set(asset.left + offset.x, asset.top + offset.y)
      this.#eyeSprite.visible = true
    }

    this.#application.render()
  }

  async #playBlink() {
    if (!this.#sceneReady) {
      return
    }

    const sequence = this.#eyeSequence + 1
    this.#eyeSequence = sequence
    this.#renderEye('half')
    await wait(HALF_FRAME_DURATION)

    if (!this.#canContinueBlink(sequence)) {
      return
    }

    this.#renderEye('closed')
    await wait(CLOSED_FRAME_DURATION)

    if (!this.#canContinueBlink(sequence)) {
      return
    }

    this.#renderEye('half')
    await wait(HALF_FRAME_DURATION)

    if (this.#canContinueBlink(sequence)) {
      this.#renderEye('open')
    }
  }

  #canContinueBlink(sequence: number) {
    return !this.#destroyed && this.#sceneReady && sequence === this.#eyeSequence
  }

  async #transitionTo(source: string, depthSource: string) {
    if (this.#isRequestedScene(source, depthSource)) {
      return
    }

    const version = this.#transitionVersion + 1
    this.#startLoading()
    this.#transitionVersion = version
    this.#requestedSource = source
    this.#requestedDepthSource = depthSource
    this.#eyeSequence += 1
    this.#sceneReady = false
    this.#renderEye('open')
    this.#cancelTransition()
    this.#application.render()

    try {
      const textures = await acquireTextureGroup([source, depthSource])

      if (this.#destroyed || version !== this.#transitionVersion) {
        releaseTextureGroup(textures)
        return
      }

      const sprite = new Sprite(textures[0].texture)
      sprite.alpha = 0
      sprite.zIndex = 1
      this.#incomingScene = sprite
      this.#incomingTextures = textures
      this.#depthFilter?.setDepthTransition(textures[1].texture)
      this.#sceneLayer.addChild(sprite)
      this.#animateTransition(source, depthSource, sprite, version)
    } catch (error: unknown) {
      if (this.#destroyed || version !== this.#transitionVersion) {
        return
      }

      if (version === this.#transitionVersion) {
        this.#requestedSource = null
        this.#requestedDepthSource = null
        this.#sceneReady = this.#currentScene !== null
        this.#onLoadingChange(false)
      }

      throw error
    }
  }

  #animateTransition(source: string, depthSource: string, sprite: Sprite, version: number) {
    if (this.#parallax.prefersReducedMotion) {
      sprite.alpha = 1
      this.#depthFilter?.setDepthMix(1)
      this.#application.render()
      this.#finishTransition(source, depthSource, sprite)
      return
    }

    const startedAt = window.performance.now()
    const renderFrame = (timestamp: number) => {
      if (this.#destroyed || version !== this.#transitionVersion) {
        return
      }

      const progress = Math.min(1, (timestamp - startedAt) / SCENE_TRANSITION_DURATION)
      sprite.alpha = progress
      this.#depthFilter?.setDepthMix(progress)
      this.#application.render()

      if (progress < 1) {
        this.#transitionFrame = window.requestAnimationFrame(renderFrame)
        return
      }

      this.#finishTransition(source, depthSource, sprite)
    }

    this.#transitionFrame = window.requestAnimationFrame(renderFrame)
  }

  #finishTransition(source: string, depthSource: string, sprite: Sprite) {
    const previousTextures = this.#currentTextures
    this.#currentScene?.removeFromParent()
    this.#currentScene?.destroy()
    sprite.zIndex = 0
    this.#currentScene = sprite
    this.#currentSource = source
    this.#currentDepthSource = depthSource
    this.#currentTextures = this.#incomingTextures
    this.#incomingScene = null
    this.#incomingTextures = []
    this.#requestedSource = null
    this.#requestedDepthSource = null
    this.#transitionFrame = null
    this.#sceneReady = true
    this.#depthFilter?.finishDepthTransition()
    releaseTextureGroup(previousTextures)
    this.#scheduler?.start()
    this.#application.render()
    this.#finishLoadingAfterPaint()
  }

  #cancelTransition() {
    if (this.#transitionFrame !== null) {
      window.cancelAnimationFrame(this.#transitionFrame)
      this.#transitionFrame = null
    }

    this.#incomingScene?.removeFromParent()
    this.#incomingScene?.destroy()
    this.#incomingScene = null
    this.#depthFilter?.cancelDepthTransition()
    releaseTextureGroup(this.#incomingTextures)
    this.#incomingTextures = []

    if (this.#currentScene !== null) {
      this.#currentScene.alpha = 1
    }
  }

  #startLoading() {
    this.#cancelSettledFrame()
    this.#onLoadingChange(true)
  }

  #finishLoadingAfterPaint() {
    this.#cancelSettledFrame()
    this.#settledFrame = window.requestAnimationFrame(() => {
      this.#settledFrame = window.requestAnimationFrame(() => {
        this.#settledFrame = null

        if (!this.#destroyed) {
          this.#onLoadingChange(false)
        }
      })
    })
  }

  #cancelSettledFrame() {
    if (this.#settledFrame !== null) {
      window.cancelAnimationFrame(this.#settledFrame)
      this.#settledFrame = null
    }
  }

  #isCurrentScene(source: string, depthSource: string) {
    return source === this.#currentSource && depthSource === this.#currentDepthSource
  }

  #isRequestedScene(source: string, depthSource: string) {
    return source === this.#requestedSource && depthSource === this.#requestedDepthSource
  }
}
