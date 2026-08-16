import type {PViseme} from '../lip-sync'
import type {PixiLayerSceneState} from './layer-scene-definition'
import type {PixiLayerScene} from './layer-scene'
import {createPMouthTransitionController} from './mouth-transition-controller'
import {createFocusRoomLayerState} from './scene-layer-state'

export interface PSceneMouthController {
  readonly destroy: () => void
  readonly getLayerState: (
    activeViseme: PViseme,
    prefersReducedMotion: boolean,
  ) => PixiLayerSceneState
  readonly setReducedMotion: (activeViseme: PViseme, prefersReducedMotion: boolean) => void
  readonly update: (from: PViseme, to: PViseme, prefersReducedMotion: boolean) => void
}

type LayerSceneTarget = Pick<PixiLayerScene, 'update'>
type GetLayerScenes = () => readonly [LayerSceneTarget | null, LayerSceneTarget | null]

/** Coordinates co-articulated mouth state across current and incoming layer scenes. */
export const createPSceneMouthController = (
  getLayerScenes: GetLayerScenes,
): PSceneMouthController => {
  let activeViseme: PViseme = 'rest'
  let prefersReducedMotion = false

  const getLayerState = (viseme: PViseme, reducedMotion: boolean) =>
    createFocusRoomLayerState(viseme, reducedMotion, transitions.current ?? undefined)

  const apply = () => {
    const layerState = getLayerState(activeViseme, prefersReducedMotion)

    for (const layerScene of getLayerScenes()) {
      layerScene?.update(layerState)
    }
  }

  const transitions = createPMouthTransitionController(apply)

  const update = (from: PViseme, to: PViseme, reducedMotion: boolean) => {
    activeViseme = to
    prefersReducedMotion = reducedMotion

    if (from === to) {
      apply()
      return
    }

    transitions.start(from, to, reducedMotion)
  }

  const setReducedMotion = (viseme: PViseme, reducedMotion: boolean) => {
    activeViseme = viseme
    prefersReducedMotion = reducedMotion

    if (reducedMotion) {
      transitions.cancel()
    }

    apply()
  }

  return {
    destroy: transitions.destroy,
    getLayerState,
    setReducedMotion,
    update,
  }
}
