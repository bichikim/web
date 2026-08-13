import {describe, expect, it} from 'vitest'

import {FOCUS_ROOM_SCENES, getFocusRoomScene} from '../scene-catalog'

describe('focus room scene catalog', () => {
  it('should provide all twelve unique scene combinations', () => {
    const ids = FOCUS_ROOM_SCENES.map((scene) => scene.id)

    expect(ids).toHaveLength(12)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('should keep every scene definition independently addressable', () => {
    for (const scene of FOCUS_ROOM_SCENES) {
      expect(scene.layerScene.id).toContain(scene.id)
      expect(getFocusRoomScene(scene.time, scene.activity, scene.gaze)).toBe(scene)
    }

    const definitions = FOCUS_ROOM_SCENES.map((scene) => scene.layerScene)

    expect(new Set(definitions).size).toBe(definitions.length)
  })

  it('should preserve the separated prototype and animate every remaining preview', () => {
    const prototype = getFocusRoomScene('day', 'writing', 'focused')
    const generatedPreviews = FOCUS_ROOM_SCENES.filter((scene) => scene !== prototype)

    expect(prototype.layerScene.layers).toHaveLength(5)
    expect(generatedPreviews).toHaveLength(11)
    expect(
      generatedPreviews.every((scene) =>
        scene.layerScene.layers.some((layer) => (layer.motions?.length ?? 0) > 0),
      ),
    ).toBe(true)
  })
})
