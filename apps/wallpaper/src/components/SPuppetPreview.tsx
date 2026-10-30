import type {CameraSurface} from '../features/tracking/types'
import {type Accessor, createEffect, createSignal, Show} from 'solid-js'
import {SPoffoFacePosition} from './SPoffoFacePosition'
import {SPositionedPoffo} from './SPositionedPoffo'
import type {
  PoffoAgentControls,
  PoffoLipSyncControls,
  PoffoMotionControls,
} from '../features/background/types'
import type {PoffoPlacement} from '@winter-love/wallpaper/settings/model'
import type {
  PoffoTracking,
  PoffoTrackingBindings,
  PoffoTrackingOptions,
} from '@winter-love/wallpaper/settings/tracking'

interface SPuppetPreviewProps
  extends PoffoMotionControls, PoffoLipSyncControls, PoffoAgentControls {
  readonly assetId: Accessor<string | null>
  readonly load: (id: string) => Promise<string | Blob>
  readonly placement?: Accessor<PoffoPlacement | undefined>
  readonly cameraSurface?: Accessor<CameraSurface | undefined>
  readonly tracking?: Accessor<PoffoTracking | undefined>
  readonly trackingBindings?: Accessor<PoffoTrackingBindings | undefined>
  readonly trackingOptions?: Accessor<PoffoTrackingOptions | undefined>
  readonly calibrating?: boolean
  readonly onTrackingPreview?: (options: PoffoTrackingOptions | null) => void
  readonly onTrackingChange?: (options: PoffoTrackingOptions) => void | Promise<void>
  readonly onChange?: (placement: PoffoPlacement) => void | Promise<void>
}
export const SPuppetPreview = (props: SPuppetPreviewProps) => {
  const [failed, setFailed] = createSignal(false)
  createEffect(() => {
    props.assetId()
    setFailed(false)
  })
  const handleError = (cause: unknown) => {
    console.error('Poffo preview failed', cause)
    setFailed(true)
  }
  return (
    <Show
      when={!failed()}
      fallback={<p class="m-0 text-sm text-stone-600">미리보기를 불러올 수 없어요.</p>}
    >
      <Show when={props.assetId() !== null}>
        <div class="absolute inset-0">
          <SPositionedPoffo
            assetId={props.assetId}
            load={(id) => props.load(id)}
            agentBindings={props.agentBindings}
            lipsync={props.lipsync}
            lipsyncId={props.lipsyncId}
            motionId={props.motionId}
            onMotions={props.onMotions}
            onError={handleError}
            placement={props.placement}
            cameraSurface={props.cameraSurface}
            tracking={props.tracking}
            trackingBindings={props.trackingBindings}
            trackingOptions={props.trackingOptions}
            onChange={props.onChange}
          >
            <Show when={props.calibrating}>
              <SPoffoFacePosition
                value={props.trackingOptions?.()}
                onPreview={props.onTrackingPreview}
                onChange={props.onTrackingChange}
              />
            </Show>
          </SPositionedPoffo>
        </div>
      </Show>
    </Show>
  )
}
