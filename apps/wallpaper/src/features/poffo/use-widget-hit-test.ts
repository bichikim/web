import {isTauri} from '@tauri-apps/api/core'
import {type Accessor, createEffect, onCleanup} from 'solid-js'
import {useNativeHitTest} from '../hit-test'
import {createHitMask} from './create-hit-mask'
import type {WidgetHitMask} from './types'

interface UseWidgetHitTestProps {
  readonly canvas: Accessor<HTMLCanvasElement | null>
  readonly interactive: Accessor<boolean>
  readonly onError: (cause: unknown) => void
}
const MAXIMUM_EDGE = 512

/** Publishes the rendered alpha region while retaining all input during widget operations. */
export const useWidgetHitTest = (props: UseWidgetHitTestProps) => {
  const native = isTauri()
  let disposed = false
  onCleanup(() => {
    disposed = true
  })
  let mask: WidgetHitMask | null = null
  const region = useNativeHitTest({onError: props.onError})
  const sample = document.createElement('canvas')
  const context = sample.getContext('2d', {willReadFrequently: true})
  let failed = false
  createEffect(() => {
    region.publish({interactive: props.interactive(), mask})
  })
  const afterRender = () => {
    const canvas = props.canvas()
    if (!native || disposed || failed || context === null || canvas === null) {
      return
    }
    const width = Math.max(1, Math.ceil(canvas.clientWidth))
    const height = Math.max(1, Math.ceil(canvas.clientHeight))
    const scale = Math.min(1, MAXIMUM_EDGE / Math.max(width, height))
    const sampledWidth = Math.max(1, Math.round(width * scale))
    const sampledHeight = Math.max(1, Math.round(height * scale))
    if (sample.width !== sampledWidth || sample.height !== sampledHeight) {
      sample.width = sampledWidth
      sample.height = sampledHeight
    }
    try {
      context.clearRect(0, 0, sample.width, sample.height)
      context.drawImage(canvas, 0, 0, sample.width, sample.height)
      const image = context.getImageData(0, 0, sample.width, sample.height)
      mask = createHitMask(image)
      region.publish({interactive: props.interactive(), mask})
    } catch (cause) {
      failed = true
      region.disable(cause)
    }
  }
  return {afterRender}
}
