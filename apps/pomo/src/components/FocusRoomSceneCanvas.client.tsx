import {createEffect, createSignal, on, onCleanup, onMount} from 'solid-js'

import {
  FocusRoomSceneRenderer,
  type FocusRoomSceneState,
} from '../features/focus-room-animation/scene-renderer'

export interface FocusRoomSceneCanvasProps extends FocusRoomSceneState {}

export default function FocusRoomSceneCanvas(props: FocusRoomSceneCanvasProps) {
  const [canvasHost, setCanvasHost] = createSignal<HTMLDivElement>()
  let renderer: FocusRoomSceneRenderer | null = null

  const getSceneState = (): FocusRoomSceneState => ({
    activity: props.activity,
    depthSource: props.depthSource,
    gaze: props.gaze,
    source: props.source,
    time: props.time,
  })

  onMount(() => {
    const host = canvasHost()

    if (host === undefined) {
      return
    }

    renderer = new FocusRoomSceneRenderer(host)
    renderer.initialize(getSceneState()).catch((error: unknown) => {
      globalThis.reportError(error)
    })

    onCleanup(() => {
      renderer?.destroy()
      renderer = null
    })
  })

  createEffect(
    on(
      () => [props.activity, props.depthSource, props.gaze, props.source, props.time] as const,
      () => {
        renderer?.update(getSceneState())
      },
      {defer: true},
    ),
  )

  return <div class="pointer-events-none absolute inset-0" ref={setCanvasHost} />
}
