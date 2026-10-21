import {type Accessor, createEffect, createMemo, createSignal, onCleanup, untrack} from 'solid-js'
import type {Player} from '@winter-love/puppet/player'
import {usePuppetDocument} from './use-puppet-document'
import {useTracking} from '../tracking/use-tracking'
import {modelParameters} from '../tracking/model-parameters'
import type {CameraSurface, TrackingParameter} from '../tracking/types'
import type {PoffoAgentControls, PoffoLipSyncControls, PoffoMotionControls} from './types'
import {useAgentState} from '../agent-state/use-agent-state'
import {useLipSync} from '../lipsync/use-lipsync'
import type {
  PoffoTracking,
  PoffoTrackingBindings,
  PoffoTrackingOptions,
} from '@winter-love/wallpaper/settings/tracking'

interface UsePuppetProps extends PoffoMotionControls, PoffoLipSyncControls, PoffoAgentControls {
  readonly canvas: Accessor<HTMLCanvasElement | null>
  readonly assetId: Accessor<string | null>
  readonly load: (id: string) => Promise<string>
  readonly onError: (error: unknown) => void
  readonly onAfterRender?: () => void
  readonly cameraSurface?: Accessor<CameraSurface | undefined>
  readonly tracking?: Accessor<PoffoTracking | undefined>
  readonly trackingBindings?: Accessor<PoffoTrackingBindings | undefined>
  readonly trackingOptions?: Accessor<PoffoTrackingOptions | undefined>
}

export const usePuppet = (props: UsePuppetProps): void => {
  const document = usePuppetDocument({
    assetId: props.assetId,
    load: (id) => props.load(id),
    onError: (cause) => props.onError(cause),
  })
  const [active, setActive] = createSignal<Player | null>(null)
  const [parameters, setParameters] = createSignal<readonly TrackingParameter[]>([])
  const selection = createMemo(() => props.motionId?.())
  createEffect(() => {
    const player = active()
    const selected = selection()
    if (player === null) {
      return
    }
    const motionId = selected === undefined ? untrack(() => document()?.motions[0]?.id) : selected
    if (motionId === null || motionId === undefined) {
      player.stop()
    } else if (!player.playMotion(motionId, {loop: true})) {
      player.stop()
    }
  })
  useTracking({
    bindings: () => props.trackingBindings?.(),
    cameraSurface: () => props.cameraSurface?.(),
    canvas: props.canvas,
    mode: () => props.tracking?.() ?? 'off',
    onError: props.onError,
    options: () => props.trackingOptions?.(),
    parameters,
    player: active,
  })
  useLipSync({
    options: () => props.lipsync?.(),
    parameters,
    player: active,
    widgetId: () => props.lipsyncId?.(),
  })
  useAgentState({bindings: () => props.agentBindings?.(), parameters, player: active})
  createEffect(() => {
    const player = active()
    const container = props.canvas()?.parentElement
    if (
      player === null ||
      container === null ||
      container === undefined ||
      typeof globalThis.ResizeObserver === 'undefined'
    ) {
      return
    }
    const observer = new globalThis.ResizeObserver(() => player.resize())
    observer.observe(container)
    onCleanup(() => observer.disconnect())
  })
  createEffect(() => {
    const canvas = props.canvas()
    const prepared = document()
    if (canvas === null || prepared === null) {
      return
    }
    const cancellation = new AbortController()
    let player: Player | null = null
    const start = async () => {
      const {createPlayer} = await import('@winter-love/puppet/player')
      if (cancellation.signal.aborted) {
        return
      }
      const created = await createPlayer({
        canvas,
        document: prepared,
        ...(props.onAfterRender === undefined
          ? {}
          : {onAfterRender: () => props.onAfterRender?.()}),
      })
      if (cancellation.signal.aborted) {
        created.destroy()
        return
      }
      player = created
      setParameters(modelParameters(prepared))
      created.play({loop: true})
      setActive(created)
      props.onMotions?.(prepared.motions.map((motion) => motion.id))
    }
    start().catch((cause: unknown) => {
      if (!cancellation.signal.aborted) {
        props.onError(cause)
      }
    })
    onCleanup(() => {
      cancellation.abort()
      setActive(null)
      player?.destroy()
    })
  })
}
