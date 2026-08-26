import {AlphaFilter, type Container, type Filter} from 'pixi.js'

export const SCENE_HEIGHT = 941
export const SCENE_WIDTH = 1672

interface ActiveTransition {
  readonly incomingFilters: readonly Filter[]
  readonly incomingScene: Container
}

export const createSceneTransitions = () => new SceneCompositeTransitions()

/** Fades the live incoming scene as one composited layer without snapshotting its masks. */
export class SceneCompositeTransitions {
  #active: ActiveTransition | null = null
  readonly #alphaFilter = new AlphaFilter({alpha: 0})
  #destroyed = false

  capture(_scene: Container | null) {
    this.restore()
  }

  start(incomingScene: Container) {
    const incomingFilters = incomingScene.filters ?? []

    this.#alphaFilter.alpha = 0
    incomingScene.filters = [...incomingFilters, this.#alphaFilter]
    this.#active = {incomingFilters, incomingScene}
  }

  setProgress(progress: number) {
    if (this.#active !== null) {
      this.#alphaFilter.alpha = Math.min(1, Math.max(0, progress))
    }
  }

  restore() {
    const active = this.#active

    if (active === null) {
      return
    }

    active.incomingScene.filters = [...active.incomingFilters]
    this.#active = null
  }

  destroy() {
    if (this.#destroyed) {
      return
    }

    this.#destroyed = true
    this.restore()
    this.#alphaFilter.destroy()
  }
}
