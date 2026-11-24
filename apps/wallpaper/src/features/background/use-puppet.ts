import {modelTouchParameters, type TouchHandlers, useTouch} from '../touch'
import {useSemanticActions} from '../semantics/use-semantic-actions'
import {modelActions} from '../semantics/model-actions'
import {type Accessor, createEffect, createMemo, createSignal, onCleanup, untrack} from 'solid-js'
import type {
  CreatePlayerOptions,
  Player,
  PlayerAlphaCapture,
  PlayerGpuPresentation,
  PreparedPuppetDocument,
} from '@winter-love/puppet/player'
import type {CreateNativePlayerOptions} from '@winter-love/puppet/native'
import {usePuppetDocument} from './use-puppet-document'
import {useTracking} from '../tracking/use-tracking'
import {modelParameters} from '../tracking/model-parameters'
import type {CameraSurface, TrackingParameter} from '../tracking/types'
import type {
  PoffoAgentControls,
  PoffoDisplayOptions,
  PoffoLipSyncControls,
  PoffoMotionControls,
  PoffoTouchControls,
} from './types'
import {useAgentState} from '../agent-state/use-agent-state'
import {useLipSync} from '../lipsync/use-lipsync'
import {isTauri} from '@tauri-apps/api/core'
import type {
  PoffoTracking,
  PoffoTrackingBindings,
  PoffoTrackingOptions,
} from '@winter-love/wallpaper/settings/tracking'

interface UsePuppetProps
  extends
    PoffoDisplayOptions,
    PoffoMotionControls,
    PoffoLipSyncControls,
    PoffoAgentControls,
    PoffoTouchControls {
  /** Allows platform-specific presentation on the desktop character widget. */
  readonly nativeSurface?: boolean | undefined
  readonly canvas: Accessor<HTMLCanvasElement | null>
  readonly assetId: Accessor<string | null>
  readonly load: (id: string) => Promise<string | Blob>
  readonly onError: (error: unknown) => void
  readonly onAfterRender?: () => void
  /** Optional receiver for a native widget's click-through alpha samples. */
  readonly alphaCapture?: PlayerAlphaCapture | undefined
  readonly cameraSurface?: Accessor<CameraSurface | undefined>
  readonly tracking?: Accessor<PoffoTracking | undefined>
  readonly trackingBindings?: Accessor<PoffoTrackingBindings | undefined>
  readonly trackingOptions?: Accessor<PoffoTrackingOptions | undefined>
}
export interface PuppetControls extends TouchHandlers {
  /** Changes after asset preparation or renderer recovery so the player receives a fresh Canvas. */
  readonly canvasKey: Accessor<object>
  /** True only after the requested asset's configured first frame has been submitted. */
  readonly ready: Accessor<boolean>
  /** Whether the active renderer delivers requested alpha samples. */
  readonly capturesAlpha?: Accessor<boolean>
}

const followMotion = (
  player: Accessor<Player | null>,
  document: Accessor<PreparedPuppetDocument | null>,
  motionId: Accessor<string | null | undefined>,
) => {
  const selection = createMemo(motionId)
  createEffect(() => {
    const active = player()
    const selected = selection()
    if (active === null) {
      return
    }
    const motion = selected === undefined ? untrack(() => document()?.motions[0]?.id) : selected
    if (motion === null || motion === undefined || !active.playMotion(motion, {loop: true})) {
      active.stop()
    }
  })
}

const openNativePlayer = async (
  options: Omit<CreateNativePlayerOptions, 'nativeBackend'>,
  enabled: boolean | undefined,
  signal: AbortSignal,
): Promise<Player | null | undefined> => {
  if (enabled !== true || !isTauri() || !/^(?:Mac|Win)/u.test(navigator.platform)) {
    return undefined
  }
  try {
    const {createNativeWidgetBackend} = await import('../native-widget')
    const backend = await createNativeWidgetBackend()
    if (backend !== undefined && !signal.aborted) {
      const {createNativePlayer} = await import('@winter-love/puppet/native')
      if (!signal.aborted) {
        return await createNativePlayer({...options, nativeBackend: backend})
      }
    }
  } catch (cause) {
    console.warn('Native widget initialization failed; using the browser renderer.', cause)
    return null
  }
  return undefined
}

interface BrowserPresentation {
  readonly renderer: 'wgpu' | 'pixi' | 'pixi-webgl'
  readonly gpuPresentation?: PlayerGpuPresentation
}

interface RendererRetry {
  readonly asset: object
  readonly cause: unknown
  readonly next: 'bitmap' | 'pixi'
}

const usePuppetPresentation = (
  props: Pick<UsePuppetProps, 'nativeSurface' | 'onAfterRender' | 'onError'>,
  asset: Accessor<object>,
) => {
  const [failure, setFailure] = createSignal<RendererRetry | null>(null)
  const retry = createMemo(() => {
    const current = failure()
    return current?.asset === asset() ? current : null
  })
  return {
    canvasKey: createMemo(() => retry() ?? asset()),
    choose(canvas: HTMLCanvasElement, nativeFailed: boolean): BrowserPresentation {
      const previous = retry()
      if (previous?.next === 'pixi') {
        return {renderer: props.onAfterRender === undefined ? 'pixi' : 'pixi-webgl'}
      }
      if (!isTauri() || !('webkit' in globalThis)) {
        return {gpuPresentation: 'auto', renderer: 'wgpu'}
      }
      const direct =
        props.nativeSurface === true &&
        !nativeFailed &&
        previous === null &&
        typeof canvas.transferControlToOffscreen === 'function'
      return {gpuPresentation: direct ? 'worker-canvas' : 'animation-frame', renderer: 'wgpu'}
    },
    handleFailure(presentation: BrowserPresentation | undefined, ready: boolean, cause: unknown) {
      const previous = retry()
      const error =
        previous === null
          ? cause
          : new AggregateError([previous.cause, cause], 'Browser widget rendering failed')
      if (
        presentation?.renderer === 'wgpu' &&
        (presentation.gpuPresentation === 'worker-canvas' || !ready)
      ) {
        const next = presentation.gpuPresentation === 'worker-canvas' ? 'bitmap' : 'pixi'
        // A used or transferred Canvas cannot change its context type.
        if (previous?.next !== next) {
          setFailure({asset: asset(), cause: error, next})
        }
        return
      }
      props.onError(error)
    },
    retry,
  }
}

const observePlayerSize = (
  active: Accessor<Player | null>,
  canvas: Accessor<HTMLCanvasElement | null>,
) => {
  createEffect(() => {
    const player = active()
    const container = canvas()?.parentElement
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
}

export const usePuppet = (props: UsePuppetProps): PuppetControls => {
  const source = usePuppetDocument({
    assetId: props.assetId,
    load: (id) => props.load(id),
    onError: (cause) => props.onError(cause),
  })
  const {document} = source
  const presentation = usePuppetPresentation(props, () => document() ?? source)
  const [active, setActive] = createSignal<Player | null>(null)
  createEffect(() => active()?.setFit(props.fit?.() ?? 'contain'))
  const capturesAlpha = createMemo(
    () => props.alphaCapture !== undefined && active()?.getRenderingInfo().runtime === 'wgpu',
  )
  const [rendered, setRendered] = createSignal<PreparedPuppetDocument | null>(null)
  const ready = createMemo(() => source.ready() && active() !== null && rendered() === document())
  const [parameters, setParameters] = createSignal<readonly TrackingParameter[]>([])
  const touchParameters = createMemo(() =>
    document() === null ? [] : modelTouchParameters(document()!),
  )
  const touch = useTouch({
    canvas: props.canvas,
    options: () => props.touch?.(),
    parameters: touchParameters,
    player: active,
  })
  followMotion(active, document, () => props.motionId?.())
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
  const actions = createMemo(() => (document() === null ? [] : modelActions(document()!)))
  const agent = useAgentState({
    actions,
    bindings: () => props.agentBindings?.(),
    contentEnabled: () => props.semanticBindings?.()?.some((binding) => binding.enabled) ?? false,
    parameters,
    player: active,
    widgetId: () => props.lipsyncId?.(),
  })
  useSemanticActions({
    actions,
    bindings: () => props.semanticBindings?.(),
    player: active,
    reservedParameters: agent.reservedParameters,
    widgetId: () => props.lipsyncId?.(),
  })
  observePlayerSize(active, () => props.canvas())
  createEffect(() => {
    const canvas = props.canvas()
    const prepared = document()
    if (canvas === null || prepared === null) {
      return
    }
    const cancellation = new AbortController()
    let player: Player | null = null
    let mode: BrowserPresentation | undefined
    let initialized = false
    const handleRenderError = (cause: unknown) =>
      cancellation.signal.aborted ? undefined : presentation.handleFailure(mode, initialized, cause)
    const start = async () => {
      const {configurePlayerBuffering, createPlayer, flushPlayerInputs} =
        await import('@winter-love/puppet/player')
      if (cancellation.signal.aborted) {
        return
      }
      // A hidden WebKit surface cannot submit a buffered frame until it becomes visible.
      const buffering = canvas.ownerDocument.visibilityState !== 'hidden'
      const options = {
        alphaCapture: props.alphaCapture,
        buffering,
        canvas,
        document: prepared,
        fit: untrack(() => props.fit?.()),
        onAfterRender: props.onAfterRender,
        onRenderError: handleRenderError,
        renderGeometryOnly: true,
        workerRuntime: 'rust',
      } satisfies CreatePlayerOptions
      const native =
        presentation.retry() === null
          ? await openNativePlayer(options, props.nativeSurface, cancellation.signal)
          : undefined
      if (cancellation.signal.aborted) {
        native?.destroy()
        return
      }
      mode = native ? undefined : presentation.choose(canvas, native === null)
      const created = native ?? (await createPlayer({...options, ...mode}))
      if (cancellation.signal.aborted) {
        created.destroy()
        return
      }
      player = created
      setParameters(modelParameters(prepared))
      created.play({loop: true})
      setActive(created)
      props.onMotions?.(prepared.motions.map((motion) => motion.id))
      const completed = await flushPlayerInputs(created)
      if (cancellation.signal.aborted) {
        return
      }
      switch (completed) {
        case 'applied':
        case 'unavailable':
          initialized = true
          if (!buffering) {
            created.redraw()
          }
          setRendered(prepared)
          if (!buffering) {
            await configurePlayerBuffering(created, {enabled: true})
          }
          break
        case 'destroyed':
        case 'superseded':
          break
        default:
          throw new Error(`Unknown player input result: ${completed satisfies never}`)
      }
    }
    start().catch(handleRenderError)
    onCleanup(() => {
      cancellation.abort()
      setRendered(null)
      setActive(null)
      player?.destroy()
    })
  })
  return {...touch, canvasKey: presentation.canvasKey, capturesAlpha, ready}
}
