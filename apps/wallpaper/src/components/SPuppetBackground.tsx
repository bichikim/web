import {text as uiText} from '../features/localization'
import type {CameraSurface} from '../features/tracking/types'
import {type Accessor, createSignal, Show} from 'solid-js'
import {usePuppet} from '../features/background/use-puppet'
import type {
  PoffoAgentControls,
  PoffoDisplayOptions,
  PoffoLipSyncControls,
  PoffoMotionControls,
  PoffoTouchControls,
} from '../features/background/types'
import type {
  PoffoTracking,
  PoffoTrackingBindings,
  PoffoTrackingOptions,
} from '@winter-love/wallpaper/settings/tracking'

interface SPuppetBackgroundProps
  extends
    PoffoDisplayOptions,
    PoffoMotionControls,
    PoffoLipSyncControls,
    PoffoAgentControls,
    PoffoTouchControls {
  readonly assetId: Accessor<string | null>
  readonly load: (id: string) => Promise<string | Blob>
  readonly onError: (error: unknown) => void
  readonly cameraSurface?: Accessor<CameraSurface | undefined>
  readonly tracking?: Accessor<PoffoTracking | undefined>
  readonly trackingBindings?: Accessor<PoffoTrackingBindings | undefined>
  readonly trackingOptions?: Accessor<PoffoTrackingOptions | undefined>
}

export const SPuppetBackground = (props: SPuppetBackgroundProps) => {
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null)
  const touch = usePuppet({
    agentBindings: () => props.agentBindings?.(),
    assetId: () => props.assetId(),
    cameraSurface: () => props.cameraSurface?.(),
    canvas,
    fit: () => props.fit?.(),
    lipsync: () => props.lipsync?.(),
    lipsyncId: () => props.lipsyncId?.(),
    load: (id) => props.load(id),
    motionId: () => props.motionId?.(),
    onError: (cause) => props.onError(cause),
    onMotions: (ids) => props.onMotions?.(ids),
    semanticBindings: () => props.semanticBindings?.(),
    touch: () => props.touch?.(),
    tracking: () => props.tracking?.(),
    trackingBindings: () => props.trackingBindings?.(),
    trackingOptions: () => props.trackingOptions?.(),
  })
  return (
    <Show when={touch.canvasKey()} keyed>
      <canvas
        ref={setCanvas}
        class="h-full w-full touch-none"
        aria-label={uiText('Poffo 배경')}
        onPointerDown={touch.start}
        onPointerMove={touch.move}
        onPointerUp={touch.finish}
        onPointerCancel={touch.cancel}
        onLostPointerCapture={touch.lostCapture}
      />
    </Show>
  )
}
