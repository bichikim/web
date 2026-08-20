import {Container, Sprite, type Texture} from 'pixi.js'

import dayFocusedClosedImage from './assets/animation/eyes/day-focused/closed.webp'
import dayFocusedHalfImage from './assets/animation/eyes/day-focused/half.webp'
import dayFocusedScribbleClosedImage from './assets/animation/eyes/day-focused-scribble/closed.png'
import dayFocusedScribbleHalfImage from './assets/animation/eyes/day-focused-scribble/half.png'
import dayFocusedScribbleOpenImage from './assets/animation/eyes/day-focused-scribble/open.png'
import dayFocusedScribblePupilsImage from './assets/animation/eyes/day-focused-scribble/pupils.png'
import dayUserClosedImage from './assets/animation/eyes/day-user/closed.webp'
import dayUserHalfImage from './assets/animation/eyes/day-user/half.webp'
import dayUserScribbleClosedImage from './assets/animation/eyes/day-user-scribble/closed.png'
import dayUserScribbleHalfImage from './assets/animation/eyes/day-user-scribble/half.png'
import dayUserScribbleOpenImage from './assets/animation/eyes/day-user-scribble/open.png'
import dayUserScribblePupilsImage from './assets/animation/eyes/day-user-scribble/pupils.png'
import nightFocusedClosedImage from './assets/animation/eyes/night-focused/closed.webp'
import nightFocusedHalfImage from './assets/animation/eyes/night-focused/half.webp'
import nightUserClosedImage from './assets/animation/eyes/night-user/closed.webp'
import nightUserHalfImage from './assets/animation/eyes/night-user/half.webp'
import {type BlinkScheduler, createBlinkScheduler} from './blink-scheduler'
import {EYE_TARGET_OFFSETS} from './eye-motion'
import type {PixiScenePoint} from './layer-scene-definition'
import type {PActivity, PGaze, PTime} from './scene-catalog'
import type {PSceneStyle} from './scene-style'
import {acquireTextureGroup, releaseTextureGroup, type TextureLease} from './texture-leases'

export type {PActivity, PGaze, PTime} from './scene-catalog'

export interface PEyeState {
  readonly activity: PActivity
  readonly gaze: PGaze
  readonly sceneStyle?: PSceneStyle
  readonly time: PTime
}

export type PEyeMode = 'auto' | 'closed' | 'half' | 'open'

interface EyeAsset {
  readonly closed: string
  readonly half: string
  readonly halfOffset?: PixiScenePoint
  readonly left: number
  readonly open?: string
  readonly pupils?: string
  readonly top: number
}

type EyeFrame = Exclude<PEyeMode, 'auto'>

const EYE_ASSETS = {
  day: {
    focused: {closed: dayFocusedClosedImage, half: dayFocusedHalfImage, left: 850, top: 250},
    user: {closed: dayUserClosedImage, half: dayUserHalfImage, left: 850, top: 212},
  },
  night: {
    focused: {closed: nightFocusedClosedImage, half: nightFocusedHalfImage, left: 850, top: 250},
    user: {closed: nightUserClosedImage, half: nightUserHalfImage, left: 842, top: 206},
  },
} satisfies Record<PTime, Record<PGaze, EyeAsset>>

const SCRIBBLE_DAY_FOCUSED_EYE_ASSET = {
  closed: dayFocusedScribbleClosedImage,
  half: dayFocusedScribbleHalfImage,
  left: 0,
  open: dayFocusedScribbleOpenImage,
  pupils: dayFocusedScribblePupilsImage,
  top: 0,
} satisfies EyeAsset

const SCRIBBLE_DAY_USER_EYE_ASSET = {
  closed: dayUserScribbleClosedImage,
  half: dayUserScribbleHalfImage,
  halfOffset: {x: -3, y: 0},
  left: 0,
  open: dayUserScribbleOpenImage,
  pupils: dayUserScribblePupilsImage,
  top: 0,
} satisfies EyeAsset

const EYE_OFFSETS = {
  day: {
    focused: {reading: {x: 0, y: 0}, typing: {x: 0, y: 0}, writing: {x: 0, y: 0}},
    user: {reading: {x: 0, y: 0}, typing: {x: 0, y: 0}, writing: {x: 0, y: 0}},
  },
  night: {
    focused: {reading: {x: 4, y: 0}, typing: {x: 4, y: 0}, writing: {x: 4, y: 0}},
    user: {reading: {x: 0, y: 0}, typing: {x: 0, y: 0}, writing: {x: 0, y: 0}},
  },
} satisfies Record<
  PTime,
  Record<PGaze, Record<PActivity, {readonly x: number; readonly y: number}>>
>

const EYE_SOURCES = [
  dayFocusedHalfImage,
  dayFocusedClosedImage,
  dayUserHalfImage,
  dayUserClosedImage,
  nightFocusedHalfImage,
  nightFocusedClosedImage,
  nightUserHalfImage,
  nightUserClosedImage,
  dayFocusedScribbleHalfImage,
  dayFocusedScribbleClosedImage,
  dayFocusedScribbleOpenImage,
  dayFocusedScribblePupilsImage,
  dayUserScribbleHalfImage,
  dayUserScribbleClosedImage,
  dayUserScribbleOpenImage,
  dayUserScribblePupilsImage,
] as const
const HALF_FRAME_DURATION = 48
const CLOSED_FRAME_DURATION = 72
const PUPIL_MAXIMUM_DELAY = 3_200
const PUPIL_MINIMUM_DELAY = 1_400
const [CENTERED_PUPIL_OFFSET] = EYE_TARGET_OFFSETS

const wait = (duration: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, duration)
  })

const getEyeAsset = (state: PEyeState): EyeAsset => {
  if (state.sceneStyle === 'scribble') {
    return state.gaze === 'focused' ? SCRIBBLE_DAY_FOCUSED_EYE_ASSET : SCRIBBLE_DAY_USER_EYE_ASSET
  }

  return EYE_ASSETS[state.time][state.gaze]
}

/** Owns blink scheduling, eye textures, and the eye overlay container. */
export class PEyeController {
  readonly container = new Container()
  readonly #onRender: () => void
  #destroyed = false
  #mode: PEyeMode = 'auto'
  #pupilOffset: PixiScenePoint = CENTERED_PUPIL_OFFSET
  #pupilSprite: Sprite | null = null
  #pupilTimer: number | null = null
  #sceneReady = false
  #scheduler: BlinkScheduler | null = null
  #sequence = 0
  #sprite: Sprite | null = null
  #state: PEyeState | null = null
  #textureLeases: readonly TextureLease[] = []
  #textures: ReadonlyMap<string, Texture> | null = null

  constructor(onRender: () => void) {
    this.#onRender = onRender
  }

  async initialize(state: PEyeState) {
    this.#state = state
    const leases = await acquireTextureGroup(EYE_SOURCES)

    if (this.#destroyed) {
      releaseTextureGroup(leases)
      return
    }

    this.#textureLeases = leases
    this.#textures = new Map(
      EYE_SOURCES.map((source, index) => [source, leases[index].texture] as const),
    )
    this.#sprite = new Sprite(leases[0].texture)
    this.#sprite.visible = false
    this.#pupilSprite = new Sprite(leases[0].texture)
    this.#pupilSprite.visible = false
    this.container.addChild(this.#sprite, this.#pupilSprite)
    this.#scheduler = createBlinkScheduler({
      maximumDelay: 6_000,
      minimumDelay: 2_000,
      onBlink: () => this.#playBlink(),
    })

    if (this.#sceneReady) {
      this.#scheduler.start()
    }

    this.#render('open')
  }

  update(state: PEyeState) {
    this.#state = state
    this.#sequence += 1
    this.#pupilOffset = CENTERED_PUPIL_OFFSET
    this.#render('open')
    if (this.#mode === 'auto') {
      this.#scheduler?.start()
    }
  }

  setMode(mode: PEyeMode) {
    if (mode === this.#mode) {
      return
    }

    this.#mode = mode
    this.#sequence += 1
    this.#render('open')

    if (mode === 'auto' && this.#sceneReady) {
      this.#scheduler?.start()
    }
  }

  setSceneReady(sceneReady: boolean) {
    this.#sceneReady = sceneReady

    if (sceneReady) {
      this.#scheduler?.start()
      this.#schedulePupilMove()
      return
    }

    this.#sequence += 1
    this.#clearPupilTimer()
    this.#pupilOffset = CENTERED_PUPIL_OFFSET
    this.#render('open')
  }

  destroy() {
    if (this.#destroyed) {
      return
    }

    this.#destroyed = true
    this.#sequence += 1
    this.#scheduler?.destroy()
    this.#scheduler = null
    this.#clearPupilTimer()
    this.container.destroy({children: true})
    this.#pupilSprite = null
    this.#sprite = null
    releaseTextureGroup(this.#textureLeases)
    this.#textureLeases = []
    this.#textures = null
  }

  async #playBlink() {
    if (!this.#sceneReady || this.#mode !== 'auto') {
      return
    }

    const sequence = this.#sequence + 1
    this.#sequence = sequence
    this.#render('half')
    await wait(HALF_FRAME_DURATION)

    if (!this.#canContinue(sequence)) {
      return
    }

    this.#render('closed')
    await wait(CLOSED_FRAME_DURATION)

    if (!this.#canContinue(sequence)) {
      return
    }

    this.#render('half')
    await wait(HALF_FRAME_DURATION)

    if (this.#canContinue(sequence)) {
      this.#render('open')
    }
  }

  #render(frame: EyeFrame) {
    const sprite = this.#sprite
    const pupilSprite = this.#pupilSprite
    const textures = this.#textures
    const state = this.#state

    if (sprite === null || pupilSprite === null || textures === null || state === null) {
      return
    }

    const visibleFrame = this.#mode === 'auto' ? frame : this.#mode

    const asset = getEyeAsset(state)
    const source = visibleFrame === 'open' ? asset.open : asset[visibleFrame]

    if (source === undefined) {
      sprite.visible = false
    } else {
      const offset = EYE_OFFSETS[state.time][state.gaze][state.activity]
      const frameOffset = visibleFrame === 'half' ? asset.halfOffset : undefined
      const texture = textures.get(source)

      if (texture === undefined) {
        return
      }

      sprite.texture = texture
      sprite.position.set(
        asset.left + offset.x + (frameOffset?.x ?? 0),
        asset.top + offset.y + (frameOffset?.y ?? 0),
      )
      sprite.visible = true
    }

    const pupilTexture = asset.pupils === undefined ? undefined : textures.get(asset.pupils)
    const pupilsVisible = visibleFrame === 'open' && pupilTexture !== undefined

    if (pupilsVisible) {
      const offset = EYE_OFFSETS[state.time][state.gaze][state.activity]
      pupilSprite.texture = pupilTexture
      pupilSprite.position.set(
        asset.left + offset.x + this.#pupilOffset.x,
        asset.top + offset.y + this.#pupilOffset.y,
      )
    }

    pupilSprite.visible = pupilsVisible
    this.#schedulePupilMove()

    this.#onRender()
  }

  #schedulePupilMove() {
    if (this.#pupilTimer !== null || !this.#sceneReady || !this.#pupilSprite?.visible) {
      return
    }

    const delay = PUPIL_MINIMUM_DELAY + Math.random() * (PUPIL_MAXIMUM_DELAY - PUPIL_MINIMUM_DELAY)
    this.#pupilTimer = window.setTimeout(() => {
      this.#pupilTimer = null

      if (!this.#sceneReady || !this.#pupilSprite?.visible) {
        return
      }

      const candidates = EYE_TARGET_OFFSETS.filter(
        ({x, y}) => x !== this.#pupilOffset.x || y !== this.#pupilOffset.y,
      )
      const index = Math.min(candidates.length - 1, Math.floor(Math.random() * candidates.length))
      this.#pupilOffset = candidates[index]
      this.#render('open')
    }, delay)
  }

  #clearPupilTimer() {
    if (this.#pupilTimer === null) {
      return
    }

    window.clearTimeout(this.#pupilTimer)
    this.#pupilTimer = null
  }

  #canContinue(sequence: number) {
    return !this.#destroyed && this.#sceneReady && sequence === this.#sequence
  }
}
