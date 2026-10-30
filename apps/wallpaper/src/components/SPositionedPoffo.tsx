import type {CameraSurface} from '../features/tracking/types'
import type {Accessor, JSX} from 'solid-js'
import type {PoffoPlacement} from '@winter-love/wallpaper/settings/model'
import {usePlacement} from '../features/poffo'
import {SPuppetBackground} from './SPuppetBackground'
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

const PERCENT = 100

interface SPositionedPoffoProps
  extends PoffoMotionControls, PoffoLipSyncControls, PoffoAgentControls {
  readonly children?: JSX.Element
  readonly assetId: Accessor<string | null>
  readonly placement?: Accessor<PoffoPlacement | undefined>
  readonly cameraSurface?: Accessor<CameraSurface | undefined>
  readonly tracking?: Accessor<PoffoTracking | undefined>
  readonly trackingBindings?: Accessor<PoffoTrackingBindings | undefined>
  readonly trackingOptions?: Accessor<PoffoTrackingOptions | undefined>
  readonly load: (id: string) => Promise<string | Blob>
  readonly onError: (error: unknown) => void
  readonly onChange?: (placement: PoffoPlacement) => void | Promise<void>
}

export const SPositionedPoffo = (props: SPositionedPoffoProps) => {
  const movement = usePlacement({
    enabled: () => props.onChange !== undefined,
    onChange: (value) => props.onChange?.(value),
    value: () => props.placement?.(),
  })
  return (
    <div
      role="group"
      aria-label="Poffo 위치"
      tabindex={props.onChange === undefined ? undefined : 0}
      class="relative h-full w-full overflow-hidden touch-none
            focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-blue-700"
      classList={{
        'cursor-grab': props.onChange !== undefined,
        'cursor-grabbing': movement.dragging(),
      }}
      onPointerDown={movement.start}
      onPointerMove={movement.move}
      onPointerUp={movement.finish}
      onPointerCancel={movement.cancel}
      onLostPointerCapture={movement.cancel}
      onKeyDown={movement.keyboard}
    >
      <div
        class="absolute -translate-x-1/2 -translate-y-1/2 [left:var(--poffo-x)] [top:var(--poffo-y)]
            [width:var(--poffo-size)] [height:var(--poffo-size)]"
        style={{
          '--poffo-size': `${movement.placement().scale * PERCENT}%`,
          '--poffo-x': `${movement.placement().x * PERCENT}%`,
          '--poffo-y': `${movement.placement().y * PERCENT}%`,
        }}
      >
        <SPuppetBackground
          assetId={props.assetId}
          load={props.load}
          agentBindings={props.agentBindings}
          lipsync={props.lipsync}
          lipsyncId={props.lipsyncId}
          motionId={props.motionId}
          onMotions={props.onMotions}
          onError={props.onError}
          cameraSurface={props.cameraSurface}
          tracking={props.tracking}
          trackingBindings={props.trackingBindings}
          trackingOptions={props.trackingOptions}
        />
        {props.children}
      </div>
    </div>
  )
}
