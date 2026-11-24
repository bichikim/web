import {isTauri} from '@tauri-apps/api/core'
import {type Accessor, createEffect, onCleanup} from 'solid-js'
import {createHitMaskReader, extractAlpha, useNativeHitTest} from '../hit-test'
import {createHitMask} from './create-hit-mask'
import type {WidgetHitMask} from './types'
import type {FrameAlphaSample, PlayerAlphaCapture} from '@winter-love/puppet/player'

interface UseWidgetHitTestProps {
  readonly canvas: Accessor<HTMLCanvasElement | null>
  readonly interactive: Accessor<boolean>
  /** Whether the configured character is visible; omitted, rendered frames are ready. */
  readonly ready?: Accessor<boolean>
  /** Indicates that the player can deliver alpha from the GPU before a Canvas snapshot is needed. */
  readonly capturesAlpha?: Accessor<boolean>
  /** Supplies the ready character's alpha when a loading image is needed. */
  readonly onRenderedAlpha?: (frame: FrameAlphaSample) => void
  /** Indicates that the selected character still needs a loading image. */
  readonly wantsSilhouette?: () => boolean
  readonly onError: (cause: unknown) => void
}
const MAXIMUM_EDGE = 512
const SAMPLE_INTERVAL = 100

/** Publishes the rendered alpha region while retaining all input during widget operations. */
export const useWidgetHitTest = (props: UseWidgetHitTestProps) => {
  const native = isTauri()
  let disposed = false
  onCleanup(() => {
    disposed = true
  })
  let mask: WidgetHitMask | null = null
  let nextSample = 0
  const region = useNativeHitTest({onError: props.onError})
  const sample = document.createElement('canvas')
  const context = sample.getContext('2d', {willReadFrequently: true})
  let failed = false
  let gpuFailed = false
  const publish = () => {
    const ready = props.ready?.() !== false
    region.publish({
      interactive: ready && props.interactive(),
      mask: ready ? mask : null,
      ...(ready ? {} : {ready}),
    })
  }
  const updateMask = (next: WidgetHitMask) => {
    mask = next
    publish()
  }
  const wantsAlpha = () => props.ready?.() !== false && props.wantsSilhouette?.() === true
  const deliverAlpha = (frame: FrameAlphaSample) => {
    if (wantsAlpha()) {
      props.onRenderedAlpha?.(frame)
    }
  }
  const reader = native
    ? createHitMaskReader({
        onAlpha: deliverAlpha,
        onError: (cause) => {
          failed = true
          region.disable(cause)
        },
        onMask: (next) => {
          if (props.ready?.() !== false) {
            updateMask(next)
          }
        },
        requestAlpha: wantsAlpha,
      })
    : undefined
  onCleanup(() => reader?.destroy())
  let previousReady: boolean | undefined
  createEffect(() => {
    const ready = props.ready?.() !== false
    const completed = ready && previousReady === false
    previousReady = ready
    if (!ready) {
      reader?.invalidate()
      mask = null
      nextSample = 0
      gpuFailed = false
    }
    publish()
    if (completed) {
      afterRender()
    }
  })
  const requestSize: PlayerAlphaCapture['requestSize'] = () => {
    const canvas = props.canvas()
    if (!native || disposed || failed || canvas === null) {
      return
    }
    const now = Date.now()
    if (mask !== null && now < nextSample) {
      return
    }
    nextSample = now + SAMPLE_INTERVAL
    const width = Math.max(1, Math.ceil(canvas.clientWidth))
    const height = Math.max(1, Math.ceil(canvas.clientHeight))
    const scale = Math.min(1, MAXIMUM_EDGE / Math.max(width, height))
    return {
      height: Math.max(1, Math.round(height * scale)),
      width: Math.max(1, Math.round(width * scale)),
    }
  }
  const alphaCapture: PlayerAlphaCapture | undefined = native
    ? {
        onError(cause) {
          gpuFailed = true
          nextSample = 0
          afterRender()
          props.onError(cause)
        },
        onSample(frame) {
          updateMask(createHitMask({...frame, layout: 'alpha'}))
          deliverAlpha(frame)
        },
        requestSize: () => (gpuFailed ? undefined : requestSize()),
      }
    : undefined
  function afterRender() {
    const canvas = props.canvas()
    if (
      canvas === null ||
      props.ready?.() === false ||
      (!gpuFailed && props.capturesAlpha?.() === true)
    ) {
      return
    }
    const size = requestSize()
    if (size === undefined) {
      return
    }
    const {width: sampledWidth, height: sampledHeight} = size
    if (reader !== undefined) {
      reader.sample(canvas, sampledWidth, sampledHeight)
      return
    }
    if (context === null) {
      return
    }
    if (sample.width !== sampledWidth || sample.height !== sampledHeight) {
      sample.width = sampledWidth
      sample.height = sampledHeight
    }
    try {
      context.clearRect(0, 0, sample.width, sample.height)
      context.drawImage(canvas, 0, 0, sample.width, sample.height)
      const image = context.getImageData(0, 0, sample.width, sample.height)
      updateMask(createHitMask(image))
      if (wantsAlpha()) {
        props.onRenderedAlpha?.(extractAlpha(image))
      }
    } catch (cause) {
      failed = true
      region.disable(cause)
    }
  }
  return {afterRender, alphaCapture}
}
