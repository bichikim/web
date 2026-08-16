import {createEffect, createSignal, on, onCleanup, onMount, untrack} from 'solid-js'

import {
  PLayerReviewRenderer,
  type PLayerReviewState,
} from '../features/focus-room-layer-review/scene-renderer'
import type {PixiLayerSceneDefinition} from '../features/focus-room-animation'

export interface PLayerReviewCanvasProps extends PLayerReviewState {
  readonly definition: PixiLayerSceneDefinition
}

export default function PLayerReviewCanvas(props: PLayerReviewCanvasProps) {
  const [canvasHost, setCanvasHost] = createSignal<HTMLDivElement>()
  let renderer: PLayerReviewRenderer | null = null

  const getReviewState = (): PLayerReviewState => ({
    animationEnabled: props.animationEnabled,
    eyesVisible: props.eyesVisible,
    handsVisible: props.handsVisible,
    headVisible: props.headVisible,
    mouthVisible: props.mouthVisible,
    referenceOpacity: props.referenceOpacity,
    viseme: props.viseme,
  })

  onMount(() => {
    const host = canvasHost()

    if (host === undefined) {
      return
    }

    renderer = new PLayerReviewRenderer(host, {definition: props.definition})
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
          props.mouthVisible,
          props.referenceOpacity,
          props.viseme,
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
