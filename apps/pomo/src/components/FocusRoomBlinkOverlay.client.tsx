import {Application, Assets, Sprite, type Texture} from 'pixi.js'
import {createEffect, createSignal, on, onCleanup, onMount} from 'solid-js'

import dayFocusedClosedImage from '../../assets/focus-room-animation/eyes-day-focused-closed.png'
import dayFocusedHalfImage from '../../assets/focus-room-animation/eyes-day-focused-half.png'
import dayUserClosedImage from '../../assets/focus-room-animation/eyes-day-user-closed.png'
import dayUserHalfImage from '../../assets/focus-room-animation/eyes-day-user-half.png'
import nightFocusedClosedImage from '../../assets/focus-room-animation/eyes-night-focused-closed.png'
import nightFocusedHalfImage from '../../assets/focus-room-animation/eyes-night-focused-half.png'
import nightUserClosedImage from '../../assets/focus-room-animation/eyes-night-user-closed.png'
import nightUserHalfImage from '../../assets/focus-room-animation/eyes-night-user-half.png'
import {
  type BlinkScheduler,
  createBlinkScheduler,
} from '../features/focus-room-animation/blink-scheduler'

export type FocusRoomActivity = 'reading' | 'typing' | 'writing'
export type FocusRoomGaze = 'focused' | 'user'
export type FocusRoomTime = 'day' | 'night'

export interface FocusRoomBlinkOverlayProps {
  readonly activity: FocusRoomActivity
  readonly gaze: FocusRoomGaze
  readonly sceneReady: boolean
  readonly time: FocusRoomTime
}

interface EyeAsset {
  readonly closed: string
  readonly half: string
  readonly left: number
  readonly top: number
}

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
      top: 242,
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
      top: 236,
    },
  },
} satisfies Record<FocusRoomTime, Record<FocusRoomGaze, EyeAsset>>

const HALF_FRAME_DURATION = 48
const CLOSED_FRAME_DURATION = 72
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

export default function FocusRoomBlinkOverlay(props: FocusRoomBlinkOverlayProps) {
  const [canvasHost, setCanvasHost] = createSignal<HTMLDivElement>()
  const [application, setApplication] = createSignal<Application | null>(null)
  const [sprite, setSprite] = createSignal<Sprite | null>(null)
  const [textures, setTextures] = createSignal<Record<
    FocusRoomTime,
    Record<FocusRoomGaze, Record<'closed' | 'half', Texture>>
  > | null>(null)
  const [scheduler, setScheduler] = createSignal<BlinkScheduler | null>(null)
  const [activeGaze, setActiveGaze] = createSignal<FocusRoomGaze>('focused')
  const [activeActivity, setActiveActivity] = createSignal<FocusRoomActivity>('reading')
  const [activeTime, setActiveTime] = createSignal<FocusRoomTime>('day')
  const [sceneReady, setSceneReady] = createSignal(false)

  const renderEyeState = (state: 'closed' | 'half' | 'open') => {
    const currentApplication = application()
    const currentSprite = sprite()
    const currentTextures = textures()

    if (currentApplication === null || currentSprite === null || currentTextures === null) {
      return
    }

    if (state === 'open') {
      currentSprite.visible = false
    } else {
      const gaze = activeGaze()
      const time = activeTime()
      const asset = EYE_ASSETS[time][gaze]
      const offset = EYE_OFFSETS[time][gaze][activeActivity()]

      currentSprite.texture = currentTextures[time][gaze][state]
      currentSprite.position.set(asset.left + offset.x, asset.top + offset.y)
      currentSprite.visible = true
    }

    currentApplication.render()
  }

  const playBlink = async () => {
    if (!sceneReady()) {
      return
    }

    renderEyeState('half')
    await wait(HALF_FRAME_DURATION)
    renderEyeState('closed')
    await wait(CLOSED_FRAME_DURATION)
    renderEyeState('half')
    await wait(HALF_FRAME_DURATION)
    renderEyeState('open')
  }

  onMount(() => {
    const host = canvasHost()

    if (host === undefined) {
      return
    }

    let disposed = false
    const currentApplication = new Application()

    const initialize = async () => {
      await currentApplication.init({
        antialias: false,
        autoStart: false,
        backgroundAlpha: 0,
        height: 941,
        preference: 'webgl',
        resolution: 1,
        width: 1672,
      })

      if (disposed) {
        currentApplication.destroy(true)
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
      ] = await Promise.all([
        Assets.load<Texture>(dayFocusedHalfImage),
        Assets.load<Texture>(dayFocusedClosedImage),
        Assets.load<Texture>(dayUserHalfImage),
        Assets.load<Texture>(dayUserClosedImage),
        Assets.load<Texture>(nightFocusedHalfImage),
        Assets.load<Texture>(nightFocusedClosedImage),
        Assets.load<Texture>(nightUserHalfImage),
        Assets.load<Texture>(nightUserClosedImage),
      ])

      if (disposed) {
        currentApplication.destroy(true)
        return
      }

      const eyeSprite = new Sprite(dayFocusedHalf)
      eyeSprite.visible = false
      currentApplication.stage.addChild(eyeSprite)
      currentApplication.canvas.setAttribute('aria-hidden', 'true')
      currentApplication.canvas.className = 'absolute inset-0 h-full w-full'
      host.append(currentApplication.canvas)
      setApplication(currentApplication)
      setSprite(eyeSprite)
      setTextures({
        day: {
          focused: {closed: dayFocusedClosed, half: dayFocusedHalf},
          user: {closed: dayUserClosed, half: dayUserHalf},
        },
        night: {
          focused: {closed: nightFocusedClosed, half: nightFocusedHalf},
          user: {closed: nightUserClosed, half: nightUserHalf},
        },
      })

      const blinkScheduler = createBlinkScheduler({
        maximumDelay: 6_000,
        minimumDelay: 2_000,
        onBlink: playBlink,
      })
      setScheduler(blinkScheduler)
      blinkScheduler.start()
      currentApplication.render()
    }

    initialize().catch((error: unknown) => {
      globalThis.reportError(error)
    })

    onCleanup(() => {
      disposed = true
      scheduler()?.destroy()
      setScheduler(null)
      setApplication(null)
      setSprite(null)
      setTextures(null)
      currentApplication.destroy(true)
    })
  })

  createEffect(
    on(
      () => [props.activity, props.gaze, props.sceneReady, props.time] as const,
      ([activity, gaze, ready, time]) => {
        setActiveActivity(activity)
        setActiveGaze(gaze)
        setSceneReady(ready)
        setActiveTime(time)
        renderEyeState('open')
        scheduler()?.start()
      },
      {defer: false},
    ),
  )

  return <div class="pointer-events-none absolute inset-0 z-10" ref={setCanvasHost} />
}
