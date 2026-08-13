import {describe, expect, it} from 'vitest'

import {FOCUS_ROOM_PREVIEW_CHANNELS, FOCUS_ROOM_SCENES, getFocusRoomScene} from '../scene-catalog'

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

  it('should use true separated layers instead of pixel distortion in every preview', () => {
    for (const scene of FOCUS_ROOM_SCENES) {
      const expectedLayerCount = scene.id === 'day-reading-focused' ? 6 : 5

      expect(scene.layerScene.layers).toHaveLength(expectedLayerCount)
      expect(scene.layerScene.layers.map((layer) => layer.id)).toContain('head')
      expect(
        scene.layerScene.layers.filter(
          (layer) => layer.channel === FOCUS_ROOM_PREVIEW_CHANNELS.hands,
        ),
      ).toHaveLength(2)
      expect(
        scene.layerScene.layers.every(
          (layer) => layer.motion?.kind !== 'pixel-oscillation' && layer.motions === undefined,
        ),
      ).toBe(true)
    }
  })

  it('should attach the focused reading irises to the moving head', () => {
    const scene = getFocusRoomScene('day', 'reading', 'focused')
    const eyeLayer = scene.layerScene.layers.find((layer) => layer.id === 'eye-irises')

    expect(eyeLayer).toMatchObject({
      channel: FOCUS_ROOM_PREVIEW_CHANNELS.eyes,
      motion: {kind: 'translation'},
      parentAttachmentId: 'eyes',
    })
  })

  it('should expose the complete review panel channels for every preview', () => {
    for (const scene of FOCUS_ROOM_SCENES) {
      const channels = scene.layerScene.layers.flatMap((layer) => [
        ...(layer.channel === undefined ? [] : [layer.channel]),
        ...(layer.motion?.channel === undefined ? [] : [layer.motion.channel]),
        ...(layer.motions?.flatMap((motion) =>
          motion.channel === undefined ? [] : [motion.channel],
        ) ?? []),
      ])

      expect(channels).toContain(FOCUS_ROOM_PREVIEW_CHANNELS.head)
      expect(channels).toContain(FOCUS_ROOM_PREVIEW_CHANNELS.hands)
      expect(channels).toContain(FOCUS_ROOM_PREVIEW_CHANNELS.reference)
    }
  })
})
