import {createEffect, createSignal, on, onCleanup, onMount, untrack} from 'solid-js'

import {
  FocusRoomSceneRenderer,
  type FocusRoomSceneState,
} from '../features/focus-room-animation/scene-renderer'

export interface FocusRoomSceneCanvasProps extends FocusRoomSceneState {
  readonly onLoadingChange: (isLoading: boolean) => void
}

export default function FocusRoomSceneCanvas(props: FocusRoomSceneCanvasProps) {
  const [canvasHost, setCanvasHost] = createSignal<HTMLDivElement>()
  let renderer: FocusRoomSceneRenderer | null = null

  const getSceneState = (): FocusRoomSceneState => ({
    activity: props.activity,
    depthSource: props.depthSource,
    gaze: props.gaze,
    layerScene: props.layerScene,
    source: props.source,
    time: props.time,
  })

  onMount(() => {
    const host = canvasHost()

    if (host === undefined) {
      return
    }

    const onLoadingChange = untrack(() => props.onLoadingChange)
    renderer = new FocusRoomSceneRenderer(host, {onLoadingChange})
    renderer.initialize(untrack(getSceneState)).catch((error: unknown) => {
      onLoadingChange(false)
      globalThis.reportError(error)
    })

    onCleanup(() => {
      renderer?.destroy()
      renderer = null
    })
  })

  createEffect(
    on(
      () =>
        [
          props.activity,
          props.depthSource,
          props.gaze,
          props.layerScene,
          props.source,
          props.time,
        ] as const,
      () => {
        renderer?.update(getSceneState())
      },
      {defer: true},
    ),
  )

  return <div class="pointer-events-none absolute inset-0" ref={setCanvasHost} />
}
