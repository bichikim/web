import {describe, expect, it} from 'vitest'

import {FOCUS_ROOM_PREVIEW_CHANNELS, FOCUS_ROOM_SCENES, getPScene} from '../scene-catalog'

describe('focus room scene catalog', () => {
  it('should provide all twelve unique scene combinations', () => {
    const ids = FOCUS_ROOM_SCENES.map((scene) => scene.id)

    expect(ids).toHaveLength(12)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('should keep every scene definition independently addressable', () => {
    for (const scene of FOCUS_ROOM_SCENES) {
      expect(scene.layerScene.id).toContain(scene.id)
      expect(getPScene(scene.time, scene.activity, scene.gaze)).toBe(scene)
    }

    const definitions = FOCUS_ROOM_SCENES.map((scene) => scene.layerScene)

    expect(new Set(definitions).size).toBe(definitions.length)
  })

  it('should use true separated layers instead of pixel distortion in every preview', () => {
    for (const scene of FOCUS_ROOM_SCENES) {
      const expectedLayerCount = 6

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

  it('should attach separated irises to supported heads', () => {
    const eyeMotionScenes = FOCUS_ROOM_SCENES
    const expectedOriginX: Partial<Record<(typeof FOCUS_ROOM_SCENES)[number]['id'], number>> = {
      'day-typing-focused': -1,
      'night-typing-focused': -5,
      'night-writing-focused': -4,
    }

    expect(eyeMotionScenes).toHaveLength(12)

    for (const scene of eyeMotionScenes) {
      const eyeLayer = scene.layerScene.layers.find((layer) => layer.id === 'eye-irises')

      expect(eyeLayer).toMatchObject({
        channel: FOCUS_ROOM_PREVIEW_CHANNELS.eyes,
        motion: {
          kind: 'translation',
          targets: expect.any(Array),
          transitionSeconds: 0.04,
          travel: {maximumSeconds: 3.2, minimumSeconds: 1.4},
        },
        parentAttachmentId: 'eyes',
      })

      if (eyeLayer?.motion?.kind === 'translation' && 'targets' in eyeLayer.motion) {
        const origin = eyeLayer.motion.targets[0]
        const horizontalDistances = new Set(
          eyeLayer.motion.targets
            .filter((target) => target.y === origin?.y)
            .map((target) => Number(Math.abs(target.x - (origin?.x ?? 0)).toFixed(3))),
        )
        const verticalDistances = new Set(
          eyeLayer.motion.targets
            .filter((target) => target.x === origin?.x)
            .map((target) => Number(Math.abs(target.y - (origin?.y ?? 0)).toFixed(3))),
        )

        expect(eyeLayer.motion.targets).toHaveLength(25)
        expect(origin?.x).toBe(expectedOriginX[scene.id] ?? 0)
        expect(origin?.y).toBe(0)
        expect(horizontalDistances).toEqual(new Set([0, 0.45, 0.9, 1.5]))
        expect(verticalDistances).toEqual(new Set([0, 0.225, 0.45, 0.75]))
      }
    }

    const eyeMotions = eyeMotionScenes.map(
      (scene) => scene.layerScene.layers.find((layer) => layer.id === 'eye-irises')?.motion,
    )

    expect(new Set(eyeMotions).size).toBe(eyeMotions.length)
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
