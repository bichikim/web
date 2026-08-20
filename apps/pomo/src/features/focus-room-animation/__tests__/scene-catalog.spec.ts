import {describe, expect, it} from 'vitest'

import {FOCUS_ROOM_JAW_CHANNEL} from '../scene-catalog-channels'
import {FOCUS_ROOM_PREVIEW_CHANNELS, FOCUS_ROOM_SCENES, getPScene} from '../scene-catalog'
import {getPSceneLayer} from '../scene-layer-catalog'

describe('focus room scene catalog', () => {
  it('should provide all twelve unique scene combinations', () => {
    const ids = FOCUS_ROOM_SCENES.map((scene) => scene.id)

    expect(ids).toHaveLength(12)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('should keep every scene definition independently addressable', () => {
    for (const scene of FOCUS_ROOM_SCENES) {
      expect(getPSceneLayer(scene.id).id).toContain(scene.id)
      expect(getPScene(scene.time, scene.activity, scene.gaze)).toBe(scene)
    }

    const definitions = FOCUS_ROOM_SCENES.map((scene) => getPSceneLayer(scene.id))

    expect(new Set(definitions).size).toBe(definitions.length)
  })

  it('should replace only prepared scenes in the scribble dataset', () => {
    const preparedScenes = [
      {scene: getPScene('day', 'reading', 'focused'), source: 'day-reading-focused-scribble'},
      {scene: getPScene('day', 'typing', 'focused'), source: 'day-typing-focused-scribble'},
      {scene: getPScene('day', 'writing', 'focused'), source: 'day-writing-focused-scribble'},
    ]

    for (const {scene, source} of preparedScenes) {
      expect(getPSceneLayer(scene.id, 'scribble')).toMatchObject({
        id: `scribble-${scene.id}-layers`,
        layers: [
          {id: 'background', source: expect.stringContaining(`${source}-background`)},
          {
            id: 'head',
            position: {x: 809, y: 127},
            source: expect.stringContaining('day-focused-scribble-head'),
          },
        ],
      })
    }

    const preparedSceneIds = new Set(preparedScenes.map(({scene}) => scene.id))

    for (const scene of FOCUS_ROOM_SCENES.filter((scene) => !preparedSceneIds.has(scene.id))) {
      expect(getPSceneLayer(scene.id, 'scribble')).toBe(getPSceneLayer(scene.id, 'original'))
    }
  })

  it('should use true separated structural layers in every preview', () => {
    for (const scene of FOCUS_ROOM_SCENES) {
      const layerScene = getPSceneLayer(scene.id)
      const structuralLayers = layerScene.layers.filter((layer) => !layer.id.startsWith('mouth-'))
      const expectedStructuralLayerCount =
        scene.id === 'night-reading-focused'
          ? 36
          : scene.time === 'night'
            ? 13
            : scene.id === 'day-writing-focused'
              ? 7
              : 6

      expect(structuralLayers).toHaveLength(expectedStructuralLayerCount)
      expect(layerScene.layers.map((layer) => layer.id)).toContain('head')
      expect(
        layerScene.layers.filter((layer) => layer.channel === FOCUS_ROOM_PREVIEW_CHANNELS.hands),
      ).toHaveLength(2)
      expect(
        layerScene.layers.every(
          (layer) => layer.motion?.kind !== 'pixel-oscillation' && layer.motions === undefined,
        ),
      ).toBe(true)
    }
  })

  it('should animate day-writing clouds behind a fixed sky mask', () => {
    const cloudLayer = getPSceneLayer(getPScene('day', 'writing', 'focused').id).layers.find(
      (layer) => layer.id === 'day-clouds',
    )

    expect(cloudLayer).toMatchObject({
      maskSource: expect.stringContaining('sky-mask'),
      motion: {
        kind: 'looping-translation',
        travel: {maximumSeconds: 32, minimumSeconds: 32},
      },
      opacity: 0.38,
    })
  })

  it('should pulse all user-provided building layers at independent random intervals', () => {
    const nightScenes = FOCUS_ROOM_SCENES.filter((scene) => scene.time === 'night')
    const expectedSources = [
      'building-lights/01',
      'building-lights/02',
      'building-lights/03',
      'building-lights/04',
      'building-lights/05',
      'building-lights/06',
      'building-lights/07',
    ]

    expect(nightScenes).toHaveLength(6)
    for (const scene of nightScenes) {
      const buildingLayers = getPSceneLayer(scene.id).layers.filter((layer) =>
        layer.id.startsWith('building-lights-'),
      )

      expect(buildingLayers).toHaveLength(7)
      expect(buildingLayers.map((layer) => layer.source)).toEqual(
        expectedSources.map((source) => expect.stringContaining(source)),
      )
      for (const buildingLayer of buildingLayers) {
        expect(buildingLayer.motion).toMatchObject({
          kind: 'opacity-pulse',
          maximumOpacity: 1,
          minimumOpacity: 0,
          transitionSeconds: 1,
          travel: {maximumSeconds: 12, minimumSeconds: 2},
        })
      }
    }
    expect(
      FOCUS_ROOM_SCENES.flatMap((scene) => getPSceneLayer(scene.id).layers).some((layer) =>
        layer.id.startsWith('building-state-'),
      ),
    ).toBe(false)
  })

  it('should twinkle seventeen separate stars only in the night reading focused trial', () => {
    const trialScene = getPScene('night', 'reading', 'focused')
    const starLayers = getPSceneLayer(trialScene.id).layers.filter((layer) =>
      layer.id.startsWith('sky-star-'),
    )

    expect(starLayers).toHaveLength(17)
    expect(starLayers.map((layer) => layer.source)).toEqual(
      Array.from({length: 17}, (_, index) =>
        expect.stringContaining(`stars/${String(index + 1).padStart(2, '0')}`),
      ),
    )
    for (const starLayer of starLayers) {
      expect(starLayer.motion).toMatchObject({
        fall: {maximumSeconds: 0.6, minimumSeconds: 0.25},
        flashChance: 0.06,
        flashFall: {maximumSeconds: 0.32, minimumSeconds: 0.12},
        flashHold: {maximumSeconds: 0.12, minimumSeconds: 0.04},
        flashRise: {maximumSeconds: 0.14, minimumSeconds: 0.05},
        kind: 'opacity-twinkle',
        maximumOpacity: 1,
        minimumOpacity: 0,
        rise: {maximumSeconds: 0.25, minimumSeconds: 0.1},
        travel: {maximumSeconds: 6, minimumSeconds: 1.5},
      })
    }
    expect(
      FOCUS_ROOM_SCENES.filter((scene) => scene.id !== trialScene.id).every((scene) =>
        getPSceneLayer(scene.id).layers.every((layer) => !layer.id.startsWith('sky-star-')),
      ),
    ).toBe(true)
  })

  it('should softly fade six faint background stars only in the night reading focused trial', () => {
    const trialScene = getPScene('night', 'reading', 'focused')
    const trialLayerScene = getPSceneLayer(trialScene.id)
    const backgroundLayer = trialLayerScene.layers.find((layer) => layer.id === 'background')
    const faintLayers = trialLayerScene.layers.filter((layer) =>
      layer.id.startsWith('sky-faint-star-'),
    )

    expect(backgroundLayer?.source).toContain('background')
    expect(trialLayerScene.layers.every((layer) => layer.id !== 'sky-faint-stars-cleanup')).toBe(
      true,
    )
    expect(faintLayers).toHaveLength(6)
    for (const [index, faintLayer] of faintLayers.entries()) {
      expect(faintLayer.source).toContain(`faint-stars/0${index + 1}`)
      expect(faintLayer.motion).toMatchObject({
        kind: 'opacity-pulse',
        maximumOpacity: 1,
        minimumOpacity: 0,
        transitionSeconds: 1.6,
        travel: {maximumSeconds: 12, minimumSeconds: 3},
      })
    }
    expect(
      FOCUS_ROOM_SCENES.filter((scene) => scene.id !== trialScene.id).every((scene) =>
        getPSceneLayer(scene.id).layers.every((layer) => !layer.id.startsWith('sky-faint-star')),
      ),
    ).toBe(true)
  })

  it('should attach separated irises to supported heads', () => {
    const eyeMotionScenes = FOCUS_ROOM_SCENES
    const expectedOriginX: Partial<Record<(typeof FOCUS_ROOM_SCENES)[number]['id'], number>> = {
      'day-typing-focused': -1,
    }

    expect(eyeMotionScenes).toHaveLength(12)

    for (const scene of eyeMotionScenes) {
      const eyeLayer = getPSceneLayer(scene.id).layers.find((layer) => layer.id === 'eye-irises')

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
      (scene) => getPSceneLayer(scene.id).layers.find((layer) => layer.id === 'eye-irises')?.motion,
    )

    expect(new Set(eyeMotions).size).toBe(eyeMotions.length)
  })

  it('should use the original night head smile for the rest viseme', () => {
    const dayUserScenes = FOCUS_ROOM_SCENES.filter(
      (scene) => scene.gaze === 'user' && scene.time === 'day',
    )
    const nightUserScenes = FOCUS_ROOM_SCENES.filter(
      (scene) => scene.gaze === 'user' && scene.time === 'night',
    )

    expect(dayUserScenes).toHaveLength(3)
    expect(
      dayUserScenes.every(
        (scene) =>
          getPSceneLayer(scene.id).layers.filter((layer) => layer.id.startsWith('mouth-'))
            .length === 6,
      ),
    ).toBe(true)
    expect(nightUserScenes).toHaveLength(3)
    expect(
      nightUserScenes.every((scene) => {
        const mouthLayers = getPSceneLayer(scene.id).layers.filter((layer) =>
          layer.id.startsWith('mouth-'),
        )

        return mouthLayers.length === 5 && mouthLayers.every((layer) => layer.id !== 'mouth-rest')
      }),
    ).toBe(true)
  })

  it('should move only the regular night reading head while keeping every mouth layer untouched', () => {
    for (const scene of FOCUS_ROOM_SCENES) {
      const layerScene = getPSceneLayer(scene.id)
      const head = layerScene.layers.find((layer) => layer.id === 'head')
      const mouthLayers = layerScene.layers.filter((layer) => layer.id.startsWith('mouth-'))

      expect(mouthLayers.every((layer) => layer.statePixelPush === undefined)).toBe(true)

      if (scene.id === 'night-reading-user') {
        expect(head?.statePixelPush).toMatchObject({
          channel: FOCUS_ROOM_JAW_CHANNEL,
          effect: {
            distance: {x: 0, y: 3},
            kind: 'masked-pixel-push',
          },
        })
      } else {
        expect(head?.statePixelPush).toBeUndefined()
      }
    }
  })

  it('should share one mouth set across every night user-facing scene', () => {
    const getMouthSources = (
      sceneId: 'night-reading-user' | 'night-typing-user' | 'night-writing-user',
    ) =>
      getPSceneLayer(sceneId)
        .layers.filter((layer) => layer.id.startsWith('mouth-'))
        .map((layer) => layer.source)
    const readingSources = getMouthSources('night-reading-user')

    expect(readingSources).toBeDefined()
    expect(getMouthSources('night-typing-user')).toEqual(readingSources)
    expect(getMouthSources('night-writing-user')).toEqual(readingSources)
  })

  it('should share the original reading head across every night user-facing scene', () => {
    const nightUserHeadSources = FOCUS_ROOM_SCENES.filter(
      (scene) => scene.gaze === 'user' && scene.time === 'night',
    ).map((scene) => getPSceneLayer(scene.id).layers.find((layer) => layer.id === 'head')?.source)

    expect(nightUserHeadSources).toHaveLength(3)
    expect(new Set(nightUserHeadSources).size).toBe(1)
  })

  it('should share the reading head across every night focused scene', () => {
    const nightFocusedHeadSources = FOCUS_ROOM_SCENES.filter(
      (scene) => scene.gaze === 'focused' && scene.time === 'night',
    ).map((scene) => getPSceneLayer(scene.id).layers.find((layer) => layer.id === 'head')?.source)

    expect(nightFocusedHeadSources).toHaveLength(3)
    expect(new Set(nightFocusedHeadSources).size).toBe(1)
  })

  it('should expose the complete review panel channels for every preview', () => {
    for (const scene of FOCUS_ROOM_SCENES) {
      const channels = getPSceneLayer(scene.id).layers.flatMap((layer) => [
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
