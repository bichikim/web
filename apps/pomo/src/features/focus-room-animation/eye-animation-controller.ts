import {Container, Sprite, type Texture} from 'pixi.js'

import dayFocusedClosedImage from './assets/animation/eyes/day-focused/closed.webp'
import dayFocusedHalfImage from './assets/animation/eyes/day-focused/half.webp'
import dayFocusedScribbleClosedImage from './assets/animation/eyes/day-focused-scribble/closed.png'
import dayFocusedScribbleHalfImage from './assets/animation/eyes/day-focused-scribble/half.png'
import dayUserClosedImage from './assets/animation/eyes/day-user/closed.webp'
import dayUserHalfImage from './assets/animation/eyes/day-user/half.webp'
import nightFocusedClosedImage from './assets/animation/eyes/night-focused/closed.webp'
import nightFocusedHalfImage from './assets/animation/eyes/night-focused/half.webp'
import nightUserClosedImage from './assets/animation/eyes/night-user/closed.webp'
import nightUserHalfImage from './assets/animation/eyes/night-user/half.webp'
import {type BlinkScheduler, createBlinkScheduler} from './blink-scheduler'
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

interface EyeAsset {
  readonly closed: string
  readonly half: string
  readonly left: number
  readonly top: number
}

type EyeFrame = 'closed' | 'half' | 'open'

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
  left: 809,
  top: 127,
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
] as const
const HALF_FRAME_DURATION = 48
const CLOSED_FRAME_DURATION = 72

const wait = (duration: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, duration)
  })

const getEyeAsset = (state: PEyeState): EyeAsset => {
  if (state.sceneStyle === 'scribble' && state.time === 'day' && state.gaze === 'focused') {
    return SCRIBBLE_DAY_FOCUSED_EYE_ASSET
  }

  return EYE_ASSETS[state.time][state.gaze]
}

/** Owns blink scheduling, eye textures, and the eye overlay container. */
export class PEyeController {
  readonly container = new Container()
  readonly #onRender: () => void
  #destroyed = false
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
    this.container.addChild(this.#sprite)
    this.#scheduler = createBlinkScheduler({
      maximumDelay: 6_000,
      minimumDelay: 2_000,
      onBlink: () => this.#playBlink(),
    })

    if (this.#sceneReady) {
      this.#scheduler.start()
    }
  }

  update(state: PEyeState) {
    this.#state = state
    this.#sequence += 1
    this.#render('open')
    this.#scheduler?.start()
  }

  setSceneReady(sceneReady: boolean) {
    this.#sceneReady = sceneReady

    if (sceneReady) {
      this.#scheduler?.start()
      return
    }

    this.#sequence += 1
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
    this.container.destroy({children: true})
    this.#sprite = null
    releaseTextureGroup(this.#textureLeases)
    this.#textureLeases = []
    this.#textures = null
  }

  async #playBlink() {
    if (!this.#sceneReady) {
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
    const textures = this.#textures
    const state = this.#state

    if (sprite === null || textures === null || state === null) {
      return
    }

    if (frame === 'open') {
      sprite.visible = false
    } else {
      const asset = getEyeAsset(state)
      const offset = EYE_OFFSETS[state.time][state.gaze][state.activity]
      const texture = textures.get(asset[frame])

      if (texture === undefined) {
        return
      }

      sprite.texture = texture
      sprite.position.set(asset.left + offset.x, asset.top + offset.y)
      sprite.visible = true
    }

    this.#onRender()
  }

  #canContinue(sequence: number) {
    return !this.#destroyed && this.#sceneReady && sequence === this.#sequence
  }
}
