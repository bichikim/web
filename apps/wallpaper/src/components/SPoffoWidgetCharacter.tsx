import {text as uiText} from '../features/localization'
import {type Accessor, createSignal, Show} from 'solid-js'
import {SWidgetLoading} from './SWidgetLoading'
import {usePuppet} from '../features/background/use-puppet'
import type {
  PoffoAgentControls,
  PoffoLipSyncControls,
  PoffoMotionControls,
  PoffoTouchControls,
} from '../features/background/types'
import {useWidgetHitTest} from '../features/poffo/use-widget-hit-test'
import type {FrameAlphaSample} from '@winter-love/puppet/player'
import type {
  PoffoTracking,
  PoffoTrackingBindings,
  PoffoTrackingOptions,
} from '@winter-love/wallpaper/settings/tracking'

interface SPoffoWidgetCharacterProps
  extends PoffoMotionControls, PoffoLipSyncControls, PoffoAgentControls, PoffoTouchControls {
  readonly assetId: Accessor<string | null>
  readonly interactive: Accessor<boolean>
  readonly load: (id: string) => Promise<string | Blob>
  readonly onError: (cause: unknown) => void
  /** Cached loading image for the selected model. */
  readonly silhouette?: string | null | undefined
  /** Receives sampled alpha when the character has rendered. */
  readonly onRenderedAlpha?: ((frame: FrameAlphaSample) => void) | undefined
  /** Indicates that the selected character still needs a loading image. */
  readonly wantsSilhouette?: (() => boolean) | undefined
  readonly tracking?: Accessor<PoffoTracking | undefined>
  readonly trackingBindings?: Accessor<PoffoTrackingBindings | undefined>
  readonly trackingOptions?: Accessor<PoffoTrackingOptions | undefined>
}
export const SPoffoWidgetCharacter = (props: SPoffoWidgetCharacterProps) => {
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null)
  const hitTest = useWidgetHitTest({
    canvas,
    capturesAlpha: () => touch.capturesAlpha?.() === true,
    interactive: () => props.interactive(),
    onError: (cause) => props.onError(cause),
    onRenderedAlpha: (frame) => props.onRenderedAlpha?.(frame),
    ready: () => touch.ready(),
    wantsSilhouette: () => props.wantsSilhouette?.() === true,
  })
  const touch = usePuppet({
    agentBindings: () => props.agentBindings?.(),
    alphaCapture: hitTest.alphaCapture,
    assetId: () => props.assetId(),
    canvas,
    lipsync: () => props.lipsync?.(),
    lipsyncId: () => props.lipsyncId?.(),
    load: (id) => props.load(id),
    motionId: () => props.motionId?.(),
    nativeSurface: true,
    onAfterRender: hitTest.afterRender,
    onError: (cause) => props.onError(cause),
    onMotions: (ids) => props.onMotions?.(ids),
    semanticBindings: () => props.semanticBindings?.(),
    touch: () => props.touch?.(),
    tracking: () => props.tracking?.(),
    trackingBindings: () => props.trackingBindings?.(),
    trackingOptions: () => props.trackingOptions?.(),
  })
  return (
    <>
      <Show when={touch.canvasKey()} keyed>
        <canvas
          ref={setCanvas}
          class="h-full w-full touch-none"
          classList={{invisible: !touch.ready()}}
          aria-hidden={!touch.ready()}
          aria-label={uiText('Poffo 배경')}
          onPointerDown={touch.start}
          onPointerMove={touch.move}
          onPointerUp={touch.finish}
          onPointerCancel={touch.cancel}
          onLostPointerCapture={touch.lostCapture}
        />
      </Show>
      <Show when={!touch.ready()}>
        <SWidgetLoading assetId={props.assetId()} silhouette={props.silhouette} />
      </Show>
    </>
  )
}
