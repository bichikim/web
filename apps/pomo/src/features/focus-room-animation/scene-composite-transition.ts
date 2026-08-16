import {Application, Container, Rectangle, Sprite} from 'pixi.js'

export const SCENE_HEIGHT = 941
export const SCENE_WIDTH = 1672

interface ActiveTransition {
  readonly container: Container
  readonly incomingScene: Container
  readonly incomingSnapshot: Sprite
  readonly incomingVisible: boolean
  readonly outgoingScene: Container
  readonly outgoingVisible: boolean
}

interface PendingTransition {
  readonly scene: Container
  readonly snapshot: Sprite
}

export interface SceneCompositeTransitionsOptions {
  readonly createSnapshot: (scene: Container) => Sprite
  readonly sceneLayer: Container
}

export const createSceneTransitions = (application: Application, sceneLayer: Container) =>
  new SceneCompositeTransitions({
    createSnapshot: (scene) => {
      // AI_NOTE - Container alpha affects layered children separately, so snapshot before fading.
      const texture = application.renderer.generateTexture({
        frame: new Rectangle(0, 0, SCENE_WIDTH, SCENE_HEIGHT),
        resolution: 1,
        target: scene,
      })

      return new Sprite(texture)
    },
    sceneLayer,
  })

/** Crossfades precomposed scene snapshots while preserving their live scene trees. */
export class SceneCompositeTransitions {
  readonly #createSnapshot: (scene: Container) => Sprite
  readonly #sceneLayer: Container
  #active: ActiveTransition | null = null
  #pending: PendingTransition | null = null

  constructor(options: SceneCompositeTransitionsOptions) {
    this.#createSnapshot = options.createSnapshot
    this.#sceneLayer = options.sceneLayer
  }

  capture(scene: Container | null) {
    this.restore()

    if (scene !== null) {
      this.#pending = {scene, snapshot: this.#createSnapshot(scene)}
    }
  }

  start(incomingScene: Container) {
    const pending = this.#pending
    this.#pending = null

    if (pending === null) {
      incomingScene.alpha = 0
      return
    }

    let incomingSnapshot: Sprite | null = null
    let container: Container | null = null

    try {
      incomingSnapshot = this.#createSnapshot(incomingScene)
      incomingSnapshot.alpha = 0
      container = new Container()
      container.addChild(pending.snapshot, incomingSnapshot)
      const outgoingVisible = pending.scene.visible
      const incomingVisible = incomingScene.visible

      this.#sceneLayer.addChild(container)
      pending.scene.visible = false
      incomingScene.visible = false
      this.#active = {
        container,
        incomingScene,
        incomingSnapshot,
        incomingVisible,
        outgoingScene: pending.scene,
        outgoingVisible,
      }
    } catch (error: unknown) {
      container?.destroy({children: true, texture: true, textureSource: true})

      if (container === null) {
        pending.snapshot.destroy({texture: true, textureSource: true})
        incomingSnapshot?.destroy({texture: true, textureSource: true})
      }

      throw error
    }
  }

  setProgress(progress: number, incomingScene: Container | null) {
    const target = this.#active?.incomingSnapshot ?? incomingScene

    if (target !== null) {
      target.alpha = Math.min(1, Math.max(0, progress))
    }
  }

  restore() {
    this.#pending?.snapshot.destroy({texture: true, textureSource: true})
    this.#pending = null
    const active = this.#active

    if (active === null) {
      return
    }

    active.outgoingScene.visible = active.outgoingVisible
    active.incomingScene.visible = active.incomingVisible
    active.container.destroy({children: true, texture: true, textureSource: true})
    this.#active = null
  }
}
