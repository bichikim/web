import {Application, Assets, Sprite, type Texture} from 'pixi.js'

import dayFocusedClosedImage from '../../../assets/focus-room-animation/eyes-day-focused-closed.png'
import dayFocusedHalfImage from '../../../assets/focus-room-animation/eyes-day-focused-half.png'
import dayUserClosedImage from '../../../assets/focus-room-animation/eyes-day-user-closed.png'
import dayUserHalfImage from '../../../assets/focus-room-animation/eyes-day-user-half.png'
import nightFocusedClosedImage from '../../../assets/focus-room-animation/eyes-night-focused-closed.png'
import nightFocusedHalfImage from '../../../assets/focus-room-animation/eyes-night-focused-half.png'
import nightUserClosedImage from '../../../assets/focus-room-animation/eyes-night-user-closed.png'
import nightUserHalfImage from '../../../assets/focus-room-animation/eyes-night-user-half.png'
import {type BlinkScheduler, createBlinkScheduler} from './blink-scheduler'
import {DepthParallaxFilter} from './depth-parallax-filter'

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
const PARALLAX_EASING = 0.12
const PARALLAX_MAXIMUM_X = 9
const PARALLAX_MAXIMUM_Y = 6
const PARALLAX_SETTLE_DISTANCE = 0.01
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

export class FocusRoomSceneRenderer {
  readonly #application = new Application()
  readonly #host: HTMLDivElement
  readonly #loadedDepths = new Set<string>()
  readonly #loadedScenes = new Set<string>()
  readonly #handlePointerLeave = () => {
    this.#targetParallaxX = 0
    this.#targetParallaxY = 0
    this.#requestParallaxFrame()
  }
  readonly #handlePointerMove = (event: PointerEvent) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const horizontalPosition = (event.clientX / window.innerWidth) * 2 - 1
    const verticalPosition = (event.clientY / window.innerHeight) * 2 - 1
    this.#targetParallaxX = horizontalPosition * PARALLAX_MAXIMUM_X
    this.#targetParallaxY = verticalPosition * PARALLAX_MAXIMUM_Y
    this.#requestParallaxFrame()
  }
  #currentDepthSource: string | null = null
  #currentParallaxX = 0
  #currentParallaxY = 0
  #currentScene: Sprite | null = null
  #currentSource: string | null = null
  #destroyed = false
  #depthFilter: DepthParallaxFilter | null = null
  #eyeSequence = 0
  #eyeSprite: Sprite | null = null
  #eyeTextures: EyeTextures | null = null
  #incomingScene: Sprite | null = null
  #incomingDepthSource: string | null = null
  #incomingSource: string | null = null
  #initialized = false
  #parallaxFrame: number | null = null
  #requestedDepthSource: string | null = null
  #requestedSource: string | null = null
  #sceneReady = false
  #scheduler: BlinkScheduler | null = null
  #state: FocusRoomSceneState | null = null
  #transitionFrame: number | null = null
  #transitionVersion = 0
  #targetParallaxX = 0
  #targetParallaxY = 0

  constructor(host: HTMLDivElement) {
    this.#host = host
  }

  async initialize(state: FocusRoomSceneState) {
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

    if (this.#destroyed) {
      this.#application.destroy(true)
      return
    }

    this.#initialized = true
    this.#application.stage.sortableChildren = true
    this.#application.canvas.setAttribute('aria-hidden', 'true')
    this.#application.canvas.className =
      'pomo-scene-media absolute inset-0 h-full w-full object-cover'
    this.#host.append(this.#application.canvas)

    await Promise.all([this.#loadInitialScene(state.source, state.depthSource), this.#loadEyes()])

    if (this.#destroyed) {
      return
    }

    const latestState = this.#state

    if (latestState !== null && latestState.source !== this.#currentSource) {
      this.#transitionTo(latestState.source, latestState.depthSource).catch(reportError)
    }

    window.addEventListener('pointermove', this.#handlePointerMove, {passive: true})
    window.addEventListener('blur', this.#handlePointerLeave)
    this.#application.render()
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
    if (source !== this.#currentSource) {
      this.#transitionTo(source, depthSource).catch(reportError)
      return
    }

    if (this.#requestedSource !== null) {
      this.#transitionVersion += 1
      this.#requestedSource = null
      this.#requestedDepthSource = null
      this.#cancelTransition()
      this.#sceneReady = true
      this.#pruneSceneTextures()
      this.#application.render()
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
    window.removeEventListener('pointermove', this.#handlePointerMove)
    window.removeEventListener('blur', this.#handlePointerLeave)
    if (this.#parallaxFrame !== null) {
      window.cancelAnimationFrame(this.#parallaxFrame)
      this.#parallaxFrame = null
    }
    this.#scheduler?.destroy()
    this.#scheduler = null

    if (this.#initialized) {
      this.#application.destroy(true)
    }

    for (const source of this.#loadedScenes) {
      this.#unloadScene(source)
    }

    for (const source of this.#loadedDepths) {
      this.#unloadDepth(source)
    }

    if (this.#eyeTextures !== null) {
      Assets.unload([...EYE_SOURCES]).catch(reportError)
    }
  }

  async #loadInitialScene(source: string, depthSource: string) {
    const [texture, depthTexture] = await Promise.all([
      Assets.load<Texture>(source),
      Assets.load<Texture>(depthSource),
    ])
    this.#loadedScenes.add(source)
    this.#loadedDepths.add(depthSource)

    if (this.#destroyed) {
      this.#unloadScene(source)
      this.#unloadDepth(depthSource)
      return
    }

    const sprite = new Sprite(texture)
    sprite.zIndex = 0
    this.#application.stage.addChild(sprite)
    this.#depthFilter = new DepthParallaxFilter(depthTexture)
    this.#application.stage.filters = [this.#depthFilter]
    this.#currentDepthSource = depthSource
    this.#currentScene = sprite
    this.#currentSource = source
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
    ] = await Promise.all(EYE_SOURCES.map(async (source) => Assets.load<Texture>(source)))

    if (this.#destroyed) {
      Assets.unload([...EYE_SOURCES]).catch(reportError)
      return
    }

    this.#eyeSprite = new Sprite(dayFocusedHalf)
    this.#eyeSprite.visible = false
    this.#eyeSprite.zIndex = 2
    this.#application.stage.addChild(this.#eyeSprite)
    this.#eyeTextures = {
      day: {
        focused: {closed: dayFocusedClosed, half: dayFocusedHalf},
        user: {closed: dayUserClosed, half: dayUserHalf},
      },
      night: {
        focused: {closed: nightFocusedClosed, half: nightFocusedHalf},
        user: {closed: nightUserClosed, half: nightUserHalf},
      },
    }
    this.#scheduler = createBlinkScheduler({
      maximumDelay: 6_000,
      minimumDelay: 2_000,
      onBlink: () => this.#playBlink(),
    })
    this.#scheduler.start()
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
    if (source === this.#currentSource || source === this.#requestedSource) {
      return
    }

    const version = this.#transitionVersion + 1
    this.#transitionVersion = version
    this.#requestedSource = source
    this.#requestedDepthSource = depthSource
    this.#eyeSequence += 1
    this.#sceneReady = false
    this.#renderEye('open')
    this.#cancelTransition()
    this.#pruneSceneTextures()

    try {
      const [texture, depthTexture] = await Promise.all([
        Assets.load<Texture>(source),
        Assets.load<Texture>(depthSource),
      ])
      this.#loadedScenes.add(source)
      this.#loadedDepths.add(depthSource)

      if (this.#destroyed || version !== this.#transitionVersion) {
        this.#pruneSceneTextures()
        return
      }

      const sprite = new Sprite(texture)
      sprite.alpha = 0
      sprite.zIndex = 1
      this.#incomingScene = sprite
      this.#incomingSource = source
      this.#incomingDepthSource = depthSource
      this.#depthFilter?.setDepthTransition(depthTexture)
      this.#application.stage.addChild(sprite)
      this.#animateTransition(source, depthSource, sprite, version)
    } catch (error: unknown) {
      if (version === this.#transitionVersion) {
        this.#requestedSource = null
        this.#requestedDepthSource = null
        this.#sceneReady = this.#currentScene !== null
      }

      throw error
    }
  }

  #animateTransition(source: string, depthSource: string, sprite: Sprite, version: number) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
    this.#currentScene?.removeFromParent()
    this.#currentScene?.destroy()
    sprite.zIndex = 0
    this.#currentScene = sprite
    this.#currentSource = source
    this.#currentDepthSource = depthSource
    this.#incomingScene = null
    this.#incomingSource = null
    this.#incomingDepthSource = null
    this.#requestedSource = null
    this.#requestedDepthSource = null
    this.#transitionFrame = null
    this.#sceneReady = true
    this.#depthFilter?.finishDepthTransition()
    this.#scheduler?.start()
    this.#pruneSceneTextures()
  }

  #cancelTransition() {
    if (this.#transitionFrame !== null) {
      window.cancelAnimationFrame(this.#transitionFrame)
      this.#transitionFrame = null
    }

    this.#incomingScene?.removeFromParent()
    this.#incomingScene?.destroy()
    this.#incomingScene = null
    this.#incomingSource = null
    this.#incomingDepthSource = null
    this.#depthFilter?.cancelDepthTransition()

    if (this.#currentScene !== null) {
      this.#currentScene.alpha = 1
    }
  }

  #pruneSceneTextures() {
    for (const source of this.#loadedScenes) {
      const isActive =
        source === this.#currentSource ||
        source === this.#incomingSource ||
        source === this.#requestedSource

      if (!isActive) {
        this.#unloadScene(source)
      }
    }

    for (const source of this.#loadedDepths) {
      const isActive =
        source === this.#currentDepthSource ||
        source === this.#incomingDepthSource ||
        source === this.#requestedDepthSource

      if (!isActive) {
        this.#unloadDepth(source)
      }
    }
  }

  #unloadScene(source: string) {
    this.#loadedScenes.delete(source)
    Assets.unload(source).catch(reportError)
  }

  #unloadDepth(source: string) {
    this.#loadedDepths.delete(source)
    Assets.unload(source).catch(reportError)
  }

  #requestParallaxFrame() {
    if (this.#parallaxFrame !== null || this.#destroyed) {
      return
    }

    this.#parallaxFrame = window.requestAnimationFrame(() => this.#renderParallaxFrame())
  }

  #renderParallaxFrame() {
    this.#parallaxFrame = null
    const horizontalDistance = this.#targetParallaxX - this.#currentParallaxX
    const verticalDistance = this.#targetParallaxY - this.#currentParallaxY
    this.#currentParallaxX += horizontalDistance * PARALLAX_EASING
    this.#currentParallaxY += verticalDistance * PARALLAX_EASING
    this.#depthFilter?.setPointerOffset(this.#currentParallaxX, this.#currentParallaxY)
    this.#application.render()

    if (
      Math.abs(horizontalDistance) > PARALLAX_SETTLE_DISTANCE ||
      Math.abs(verticalDistance) > PARALLAX_SETTLE_DISTANCE
    ) {
      this.#requestParallaxFrame()
    }
  }
}
