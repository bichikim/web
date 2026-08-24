import {createEffect, createSignal, on, onCleanup, onMount, untrack} from 'solid-js'

import {
  PLayerReviewRenderer,
  type PLayerReviewState,
} from '../features/focus-room-layer-review/scene-renderer'
import {getPSceneReviewLayer} from '../features/focus-room-animation/scene-layer-catalog'
import type {PSceneId} from '../features/focus-room-animation/scene-catalog'

export interface PLayerReviewCanvasProps extends PLayerReviewState {
  readonly sceneId: PSceneId
}

export default function PLayerReviewCanvas(props: PLayerReviewCanvasProps) {
  const [canvasHost, setCanvasHost] = createSignal<HTMLDivElement>()
  let renderer: PLayerReviewRenderer | null = null

  const getReviewState = (): PLayerReviewState => ({
    activity: props.activity,
    animationEnabled: props.animationEnabled,
    eyeMode: props.eyeMode,
    eyesVisible: props.eyesVisible,
    gaze: props.gaze,
    handsVisible: props.handsVisible,
    headVisible: props.headVisible,
    mouthFrame: props.mouthFrame,
    mouthPositionComparison: props.mouthPositionComparison,
    mouthVisible: props.mouthVisible,
    referenceOpacity: props.referenceOpacity,
    sceneStyle: props.sceneStyle,
    time: props.time,
    viseme: props.viseme,
  })

  onMount(() => {
    const host = canvasHost()

    if (host === undefined) {
      return
    }

    renderer = new PLayerReviewRenderer(host, {
      definition: getPSceneReviewLayer(props.sceneId, props.sceneStyle),
    })
    renderer.initialize(untrack(getReviewState)).catch(globalThis.reportError)

    onCleanup(() => {
      renderer?.destroy()
      renderer = null
    })
  })

  createEffect(
    on(
      () => [props.sceneId, props.sceneStyle] as const,
      ([sceneId, sceneStyle]) => {
        renderer
          ?.replaceDefinition(getPSceneReviewLayer(sceneId, sceneStyle))
          .catch(globalThis.reportError)
      },
      {defer: true},
    ),
  )

  createEffect(
    on(
      () =>
        [
          props.animationEnabled,
          props.activity,
          props.eyesVisible,
          props.eyeMode,
          props.gaze,
          props.handsVisible,
          props.headVisible,
          props.mouthFrame,
          props.mouthPositionComparison,
          props.mouthVisible,
          props.referenceOpacity,
          props.sceneStyle,
          props.time,
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
