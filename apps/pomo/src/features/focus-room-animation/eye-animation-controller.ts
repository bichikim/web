import {Container, Sprite, type Texture} from 'pixi.js'

import dayFocusedClosedImage from 'assets/focus-room-animation/eyes-day-focused-closed-v2.webp'
import dayFocusedHalfImage from 'assets/focus-room-animation/eyes-day-focused-half-v2.webp'
import dayUserClosedImage from 'assets/focus-room-animation/eyes-day-user-closed.webp'
import dayUserHalfImage from 'assets/focus-room-animation/eyes-day-user-half.webp'
import nightFocusedClosedImage from 'assets/focus-room-animation/eyes-night-focused-closed.webp'
import nightFocusedHalfImage from 'assets/focus-room-animation/eyes-night-focused-half.webp'
import nightUserClosedImage from 'assets/focus-room-animation/eyes-night-user-closed.webp'
import nightUserHalfImage from 'assets/focus-room-animation/eyes-night-user-half.webp'
import {type BlinkScheduler, createBlinkScheduler} from './blink-scheduler'
import type {PActivity, PGaze, PTime} from './scene-catalog'
import {acquireTextureGroup, releaseTextureGroup, type TextureLease} from './texture-leases'

export type {PActivity, PGaze, PTime} from './scene-catalog'

export interface PEyeState {
  readonly activity: PActivity
  readonly gaze: PGaze
  readonly time: PTime
}

interface EyeAsset {
  readonly closed: string
  readonly half: string
  readonly left: number
  readonly top: number
}

type EyeFrame = 'closed' | 'half' | 'open'
type EyeTextures = Record<PTime, Record<PGaze, Record<'closed' | 'half', Texture>>>

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

const EYE_OFFSETS = {
  day: {
    focused: {reading: {x: 0, y: 0}, typing: {x: 0, y: 0}, writing: {x: 0, y: 0}},
    user: {reading: {x: 0, y: 0}, typing: {x: 0, y: 0}, writing: {x: 0, y: 0}},
  },
  night: {
    focused: {reading: {x: 4, y: 0}, typing: {x: -1, y: 0}, writing: {x: 0, y: 0}},
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
] as const
const HALF_FRAME_DURATION = 48
const CLOSED_FRAME_DURATION = 72

const wait = (duration: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, duration)
  })

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
  #textures: EyeTextures | null = null

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

    const [
      dayFocusedHalf,
      dayFocusedClosed,
      dayUserHalf,
      dayUserClosed,
      nightFocusedHalf,
      nightFocusedClosed,
      nightUserHalf,
      nightUserClosed,
    ] = leases
    this.#textureLeases = leases
    this.#textures = {
      day: {
        focused: {closed: dayFocusedClosed.texture, half: dayFocusedHalf.texture},
        user: {closed: dayUserClosed.texture, half: dayUserHalf.texture},
      },
      night: {
        focused: {closed: nightFocusedClosed.texture, half: nightFocusedHalf.texture},
        user: {closed: nightUserClosed.texture, half: nightUserHalf.texture},
      },
    }
    this.#sprite = new Sprite(dayFocusedHalf.texture)
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
      const asset = EYE_ASSETS[state.time][state.gaze]
      const offset = EYE_OFFSETS[state.time][state.gaze][state.activity]
      sprite.texture = textures[state.time][state.gaze][frame]
      sprite.position.set(asset.left + offset.x, asset.top + offset.y)
      sprite.visible = true
    }

    this.#onRender()
  }

  #canContinue(sequence: number) {
    return !this.#destroyed && this.#sceneReady && sequence === this.#sequence
  }
}
