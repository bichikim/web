import {createEffect, createSignal, on, onCleanup, onMount, untrack} from 'solid-js'

import {
  FocusRoomLayerReviewRenderer,
  type FocusRoomLayerReviewState,
} from '../features/focus-room-layer-review/scene-renderer'
import type {PixiLayerSceneDefinition} from '../features/focus-room-animation/layer-scene'

export interface FocusRoomLayerReviewCanvasProps extends FocusRoomLayerReviewState {
  readonly definition: PixiLayerSceneDefinition
}

export default function FocusRoomLayerReviewCanvas(props: FocusRoomLayerReviewCanvasProps) {
  const [canvasHost, setCanvasHost] = createSignal<HTMLDivElement>()
  let renderer: FocusRoomLayerReviewRenderer | null = null

  const getReviewState = (): FocusRoomLayerReviewState => ({
    animationEnabled: props.animationEnabled,
    eyesVisible: props.eyesVisible,
    handsVisible: props.handsVisible,
    headVisible: props.headVisible,
    referenceOpacity: props.referenceOpacity,
  })

  onMount(() => {
    const host = canvasHost()

    if (host === undefined) {
      return
    }

    renderer = new FocusRoomLayerReviewRenderer(host, {definition: props.definition})
    renderer.initialize(untrack(getReviewState)).catch(globalThis.reportError)

    onCleanup(() => {
      renderer?.destroy()
      renderer = null
    })
  })

  createEffect(
    on(
      () => props.definition,
      (definition) => {
        renderer?.replaceDefinition(definition).catch(globalThis.reportError)
      },
      {defer: true},
    ),
  )

  createEffect(
    on(
      () =>
        [
          props.animationEnabled,
          props.eyesVisible,
          props.handsVisible,
          props.headVisible,
          props.referenceOpacity,
        ] as const,
      () => {
        const state = getReviewState()
        renderer?.update(state)
      },
      {defer: true},
    ),
  )

  return <div class="relative h-full w-full" ref={setCanvasHost} />
}
