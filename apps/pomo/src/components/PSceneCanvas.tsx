import {createEffect, createSignal, on, onCleanup, onMount, untrack} from 'solid-js'

import {PSceneRenderer} from '../features/focus-room-animation/scene-renderer'
import type {PSceneMotionInput} from '../features/focus-room-animation/scene-motion'
import type {PSceneState} from '../features/focus-room-animation/scene-state'

export interface PSceneCanvasProps extends PSceneState {
  readonly onLoadingChange?: (isLoading: boolean) => void
  readonly onMotionInputChange?: (motionInput: PSceneMotionInput) => void
}

export default function PSceneCanvas(props: PSceneCanvasProps) {
  const [canvasHost, setCanvasHost] = createSignal<HTMLDivElement>()
  let renderer: PSceneRenderer | null = null

  const getSceneState = (): PSceneState => ({
    activity: props.activity,
    depthSource: props.depthSource,
    gaze: props.gaze,
    layerScene: props.layerScene,
    motionInput: props.motionInput,
    motionMode: props.motionMode,
    source: props.source,
    time: props.time,
    viseme: props.viseme,
  })

  onMount(() => {
    const host = canvasHost()

    if (host === undefined) {
      return
    }

    const onLoadingChange = untrack(() => props.onLoadingChange)
    const onMotionInputChange = untrack(() => props.onMotionInputChange)
    renderer = new PSceneRenderer(host, {onLoadingChange, onMotionInputChange})
    renderer.initialize(untrack(getSceneState)).catch((error: unknown) => {
      onLoadingChange?.(false)
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
          props.motionInput,
          props.motionMode,
          props.source,
          props.time,
          props.viseme,
        ] as const,
      () => {
        renderer?.update(getSceneState())
      },
      {defer: true},
    ),
  )

  return (
    <div
      class="absolute inset-0 cursor-grab touch-none select-none active:cursor-grabbing"
      ref={setCanvasHost}
    />
  )
}
