import {AlphaFilter, type Container} from 'pixi.js'

export class FlattenedSceneTransition {
  readonly #filter = new AlphaFilter({alpha: 0})
  readonly #scene: Container

  constructor(scene: Container) {
    this.#scene = scene
    // AI_NOTE - Container alpha blends children separately; a filter preserves precomposited patches.
    scene.filters = [this.#filter]
  }

  setAlpha(value: number) {
    this.#filter.alpha = value
  }

  destroy() {
    this.#scene.filters = null
    this.#filter.destroy()
  }
}
