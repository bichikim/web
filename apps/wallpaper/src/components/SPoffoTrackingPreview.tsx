import type {CameraSurface} from '../features/tracking/types'
import {type Accessor, createEffect, createMemo, createSignal, type JSX, on} from 'solid-js'
import {DEFAULT_POFFO_PLACEMENT, type PoffoPlacement} from '@winter-love/wallpaper/settings/model'
import type {
  PoffoTracking,
  PoffoTrackingBindings,
  PoffoTrackingOptions,
} from '@winter-love/wallpaper/settings/tracking'
import {SPoffoCameraPosition} from './SPoffoCameraPosition'
import {SPuppetPreview} from './SPuppetPreview'
import type {
  PoffoAgentControls,
  PoffoLipSyncControls,
  PoffoMotionControls,
} from '../features/background/types'
import type {PointBounds} from '../features/tracking/use-point-drag'

export interface PoffoCalibrationOptions
  extends PoffoMotionControls, PoffoLipSyncControls, PoffoAgentControls {
  readonly targetId?: string
  readonly assetId: Accessor<string | null>
  readonly load: (id: string) => Promise<string | Blob>
  readonly mode?: PoffoTracking
  readonly screenAspect?: number
  readonly characterAspect?: number
  readonly placement?: Accessor<PoffoPlacement | undefined>
  readonly bindings?: Accessor<PoffoTrackingBindings | undefined>
  readonly cameraSurface?: CameraSurface
  readonly value?: PoffoTrackingOptions
  readonly onChange?: (options: PoffoTrackingOptions) => void | Promise<void>
  readonly onPlacementChange?: (placement: PoffoPlacement) => void | Promise<void>
}
interface SPoffoTrackingPreviewProps extends PoffoCalibrationOptions {
  readonly calibrating?: boolean
  readonly actions?: JSX.Element
  readonly children?: JSX.Element
  readonly view?: PointBounds
}
const PERCENT = 100
export const SPoffoTrackingPreview = (props: SPoffoTrackingPreviewProps) => {
  const [draft, setDraft] = createSignal<PoffoTrackingOptions | null>(null)
  const target = createMemo(() => props.targetId)
  const asset = createMemo(() => props.assetId())
  const camera = createMemo(() => (props.mode ?? 'camera') === 'camera')
  const calibrating = createMemo(() => camera() && props.calibrating)
  const options = createMemo(() => draft() ?? props.value)
  const view = createMemo(() => props.view ?? {maxX: 1, maxY: 1, minX: 0, minY: 0})
  const width = () => view().maxX - view().minX
  const height = () => view().maxY - view().minY
  const surface = createMemo(() => {
    const placement = props.placement?.() ?? DEFAULT_POFFO_PLACEMENT
    const dimensions = {height: 9, width: 16}
    return (
      props.cameraSurface ?? {
        aspect: props.screenAspect ?? dimensions.width / dimensions.height,
        height: placement.scale,
        left: placement.x - placement.scale / 2,
        top: placement.y - placement.scale / 2,
        width: placement.scale,
      }
    )
  })
  createEffect(on([calibrating, camera, target, asset], () => setDraft(null)))
  return (
    <SPoffoCameraPosition
      enabled={camera()}
      aspect={props.screenAspect}
      value={props.value}
      calibrating={calibrating() ?? false}
      actions={props.actions}
      onPreview={setDraft}
      onChange={props.onChange}
    >
      <div class="absolute inset-0 grid place-items-center [container-type:size]">
        <div
          class="relative"
          classList={{
            '[width:min(100cqw,calc(100cqh*var(--scene-aspect)))] [aspect-ratio:var(--scene-aspect)]':
              props.characterAspect !== undefined,
            'h-full w-full': props.characterAspect === undefined,
          }}
          style={{'--scene-aspect': ((props.characterAspect ?? 1) * width()) / height()}}
        >
          <div
            class="absolute [left:var(--frame-x)] [top:var(--frame-y)]
            [width:var(--frame-width)] [height:var(--frame-height)]"
            style={{
              '--frame-height': `${PERCENT / height()}%`,
              '--frame-width': `${PERCENT / width()}%`,
              '--frame-x': `${(-view().minX / width()) * PERCENT}%`,
              '--frame-y': `${(-view().minY / height()) * PERCENT}%`,
            }}
          >
            <SPuppetPreview
              assetId={props.assetId}
              load={props.load}
              agentBindings={props.agentBindings}
              semanticBindings={props.semanticBindings}
              lipsync={props.lipsync}
              lipsyncId={props.lipsyncId}
              motionId={props.motionId}
              onMotions={props.onMotions}
              placement={props.placement}
              trackingBindings={props.bindings}
              cameraSurface={() => (camera() ? surface() : undefined)}
              tracking={() => props.mode ?? 'camera'}
              trackingOptions={options}
              calibrating={calibrating()}
              onTrackingPreview={setDraft}
              onTrackingChange={props.onChange}
              onChange={props.onPlacementChange}
            />
            {props.children}
          </div>
        </div>
      </div>
    </SPoffoCameraPosition>
  )
}
