import {createEffect, createSignal, on, onCleanup, onMount, untrack} from 'solid-js'

import {
  FocusRoomLayerReviewRenderer,
  type FocusRoomLayerReviewState,
} from '../features/focus-room-layer-review/scene-renderer'

export interface FocusRoomLayerReviewCanvasProps extends FocusRoomLayerReviewState {}

export default function FocusRoomLayerReviewCanvas(props: FocusRoomLayerReviewCanvasProps) {
  const [canvasHost, setCanvasHost] = createSignal<HTMLDivElement>()
  let renderer: FocusRoomLayerReviewRenderer | null = null

  const getReviewState = (): FocusRoomLayerReviewState => ({
    animationEnabled: props.animationEnabled,
    handsVisible: props.handsVisible,
    headVisible: props.headVisible,
    referenceOpacity: props.referenceOpacity,
  })

  onMount(() => {
    const host = canvasHost()

    if (host === undefined) {
      return
    }

    renderer = new FocusRoomLayerReviewRenderer(host)
    renderer.initialize(untrack(getReviewState)).catch((error: unknown) => {
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
          props.animationEnabled,
          props.handsVisible,
          props.headVisible,
          props.referenceOpacity,
        ] as const,
      () => renderer?.update(getReviewState()),
      {defer: true},
    ),
  )

  return <div class="h-full w-full" ref={setCanvasHost} />
}
