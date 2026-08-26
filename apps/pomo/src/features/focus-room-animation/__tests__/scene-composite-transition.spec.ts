import {type Application, Container, RenderTexture, Sprite} from 'pixi.js'
import {describe, expect, it, vi} from 'vitest'

import {
  createSceneTransitions,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  SceneCompositeTransitions,
} from '../scene-composite-transition'

const createSnapshot = () => new Sprite(RenderTexture.create({height: 1, width: 1}))

describe('SceneCompositeTransitions', () => {
  it('should create snapshots through the application renderer', () => {
    const texture = RenderTexture.create({height: 1, width: 1})
    const generateTexture = vi.fn(() => texture)
    const scene = new Container()
    const transitions = createSceneTransitions(
      {renderer: {generateTexture}} as unknown as Application,
      new Container(),
    )

    transitions.capture(scene)

    expect(generateTexture).toHaveBeenCalledWith({
      frame: expect.objectContaining({height: SCENE_HEIGHT, width: SCENE_WIDTH}),
      resolution: 1,
      target: scene,
    })
    transitions.restore()
  })

  it('should fade complete snapshots and restore the live scenes', () => {
    const sceneLayer = new Container()
    const outgoingScene = new Container({visible: true})
    const incomingScene = new Container({visible: false})
    const outgoingSnapshot = createSnapshot()
    const incomingSnapshot = createSnapshot()
    const createSnapshotMock = vi
      .fn()
      .mockReturnValueOnce(outgoingSnapshot)
      .mockReturnValueOnce(incomingSnapshot)
    const transitions = new SceneCompositeTransitions({
      createSnapshot: createSnapshotMock,
      sceneLayer,
    })
    transitions.capture(outgoingScene)
    transitions.start(incomingScene)

    expect(sceneLayer.children[0]?.children).toEqual([outgoingSnapshot, incomingSnapshot])
    expect(outgoingScene.visible).toBe(false)
    expect(incomingScene.visible).toBe(false)
    expect(incomingSnapshot.alpha).toBe(0)

    transitions.setProgress(0.4, incomingScene)
    expect(incomingSnapshot.alpha).toBe(0.4)
    transitions.setProgress(-1, incomingScene)
    expect(incomingSnapshot.alpha).toBe(0)
    transitions.setProgress(2, incomingScene)
    expect(incomingSnapshot.alpha).toBe(1)

    transitions.restore()
    transitions.restore()

    expect(outgoingScene.visible).toBe(true)
    expect(incomingScene.visible).toBe(false)
    expect(sceneLayer.children).toEqual([])
  })

  it('should fall back to fading the live incoming scene without an outgoing scene', () => {
    const incomingScene = new Container()
    const transitions = new SceneCompositeTransitions({
      createSnapshot,
      sceneLayer: new Container(),
    })

    transitions.capture(null)
    transitions.start(incomingScene)
    expect(incomingScene.alpha).toBe(0)
    transitions.setProgress(0.5, incomingScene)
    expect(incomingScene.alpha).toBe(0.5)
    transitions.setProgress(1, null)
    transitions.restore()
  })

  it('should destroy a captured snapshot when the transition is cancelled before start', () => {
    const snapshot = createSnapshot()
    const destroy = vi.spyOn(snapshot, 'destroy')
    const transitions = new SceneCompositeTransitions({
      createSnapshot: () => snapshot,
      sceneLayer: new Container(),
    })

    transitions.capture(new Container())
    transitions.restore()

    expect(destroy).toHaveBeenCalledWith({texture: true, textureSource: true})
  })

  it('should release both snapshots when the transition layer cannot be attached', () => {
    const sceneLayer = new Container()
    const outgoingScene = new Container()
    const incomingScene = new Container()
    const outgoingSnapshot = createSnapshot()
    const incomingSnapshot = createSnapshot()
    const outgoingDestroy = vi.spyOn(outgoingSnapshot, 'destroy')
    const incomingDestroy = vi.spyOn(incomingSnapshot, 'destroy')
    const transitions = new SceneCompositeTransitions({
      createSnapshot: vi
        .fn()
        .mockReturnValueOnce(outgoingSnapshot)
        .mockReturnValueOnce(incomingSnapshot),
      sceneLayer,
    })

    transitions.capture(outgoingScene)
    vi.spyOn(sceneLayer, 'addChild').mockImplementationOnce(() => {
      throw new Error('attach failed')
    })

    expect(() => transitions.start(incomingScene)).toThrow('attach failed')
    expect(outgoingDestroy).toHaveBeenCalledOnce()
    expect(incomingDestroy).toHaveBeenCalledOnce()
    expect(outgoingScene.visible).toBe(true)
    expect(incomingScene.visible).toBe(true)
  })

  it('should release the outgoing snapshot when incoming capture fails', () => {
    const outgoingSnapshot = createSnapshot()
    const destroy = vi.spyOn(outgoingSnapshot, 'destroy')
    const transitions = new SceneCompositeTransitions({
      createSnapshot: vi
        .fn()
        .mockReturnValueOnce(outgoingSnapshot)
        .mockImplementationOnce(() => {
          throw new Error('capture failed')
        }),
      sceneLayer: new Container(),
    })

    transitions.capture(new Container())

    expect(() => transitions.start(new Container())).toThrow('capture failed')
    expect(destroy).toHaveBeenCalledWith({texture: true, textureSource: true})
  })
})
