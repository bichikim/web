import type {CameraSurface} from '../features/tracking/types'
import {type Accessor, createSignal} from 'solid-js'
import {usePuppet} from '../features/background/use-puppet'
import type {
  PoffoAgentControls,
  PoffoLipSyncControls,
  PoffoMotionControls,
} from '../features/background/types'
import type {
  PoffoTracking,
  PoffoTrackingBindings,
  PoffoTrackingOptions,
} from '@winter-love/wallpaper/settings/tracking'

interface SPuppetBackgroundProps
  extends PoffoMotionControls, PoffoLipSyncControls, PoffoAgentControls {
  readonly assetId: Accessor<string | null>
  readonly load: (id: string) => Promise<string>
  readonly onError: (error: unknown) => void
  readonly cameraSurface?: Accessor<CameraSurface | undefined>
  readonly tracking?: Accessor<PoffoTracking | undefined>
  readonly trackingBindings?: Accessor<PoffoTrackingBindings | undefined>
  readonly trackingOptions?: Accessor<PoffoTrackingOptions | undefined>
}

export const SPuppetBackground = (props: SPuppetBackgroundProps) => {
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null)
  usePuppet({
    agentBindings: () => props.agentBindings?.(),
    assetId: () => props.assetId(),
    cameraSurface: () => props.cameraSurface?.(),
    canvas,
    lipsync: () => props.lipsync?.(),
    lipsyncId: () => props.lipsyncId?.(),
    load: (id) => props.load(id),
    motionId: () => props.motionId?.(),
    onError: (cause) => props.onError(cause),
    onMotions: (ids) => props.onMotions?.(ids),
    tracking: () => props.tracking?.(),
    trackingBindings: () => props.trackingBindings?.(),
    trackingOptions: () => props.trackingOptions?.(),
  })
  return <canvas ref={setCanvas} class="h-full w-full" aria-label="Poffo 배경" />
}
