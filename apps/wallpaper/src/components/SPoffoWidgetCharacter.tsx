import {type Accessor, createSignal} from 'solid-js'
import {usePuppet} from '../features/background/use-puppet'
import type {
  PoffoAgentControls,
  PoffoLipSyncControls,
  PoffoMotionControls,
} from '../features/background/types'
import {useWidgetHitTest} from '../features/poffo/use-widget-hit-test'
import type {
  PoffoTracking,
  PoffoTrackingBindings,
  PoffoTrackingOptions,
} from '@winter-love/wallpaper/settings/tracking'

interface SPoffoWidgetCharacterProps
  extends PoffoMotionControls, PoffoLipSyncControls, PoffoAgentControls {
  readonly assetId: Accessor<string | null>
  readonly interactive: Accessor<boolean>
  readonly load: (id: string) => Promise<string | Blob>
  readonly onError: (cause: unknown) => void
  readonly tracking?: Accessor<PoffoTracking | undefined>
  readonly trackingBindings?: Accessor<PoffoTrackingBindings | undefined>
  readonly trackingOptions?: Accessor<PoffoTrackingOptions | undefined>
}
export const SPoffoWidgetCharacter = (props: SPoffoWidgetCharacterProps) => {
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null)
  const hitTest = useWidgetHitTest({
    canvas,
    interactive: () => props.interactive(),
    onError: (cause) => props.onError(cause),
  })
  usePuppet({
    agentBindings: () => props.agentBindings?.(),
    assetId: () => props.assetId(),
    canvas,
    lipsync: () => props.lipsync?.(),
    lipsyncId: () => props.lipsyncId?.(),
    load: (id) => props.load(id),
    motionId: () => props.motionId?.(),
    onAfterRender: hitTest.afterRender,
    onError: (cause) => props.onError(cause),
    onMotions: (ids) => props.onMotions?.(ids),
    tracking: () => props.tracking?.(),
    trackingBindings: () => props.trackingBindings?.(),
    trackingOptions: () => props.trackingOptions?.(),
  })
  return <canvas ref={setCanvas} class="h-full w-full" aria-label="Poffo 배경" />
}
