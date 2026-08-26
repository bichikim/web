import {describe, expect, it} from 'vitest'

import {FOCUS_ROOM_JAW_CHANNEL, P_MOUTH_TRANSITION_STAGES} from '../scene-catalog-channels'
import {FOCUS_ROOM_PREVIEW_CHANNELS, FOCUS_ROOM_SCENES, getPScene} from '../scene-catalog'
import {getPSceneLayer, getPSceneReviewLayer} from '../scene-layer-catalog'
import {createMouthTransitionLayers} from '../mouth-layers'

describe('focus room scene catalog', () => {
  it('should omit unavailable optional mouth transition layers', () => {
    expect(
      createMouthTransitionLayers({
        parentAttachmentId: 'head',
        position: {x: 0, y: 0},
        sources: {},
      }),
    ).toEqual([])
  })

  it('should provide all twelve unique scene combinations', () => {
    const ids = FOCUS_ROOM_SCENES.map((scene) => scene.id)

    expect(ids).toHaveLength(12)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('should expose day reading focus as the stable default catalog entry', () => {
    const defaultScene = FOCUS_ROOM_SCENES[0]

    expect(defaultScene?.id).toBe('day-reading-focused')
    expect(getPScene('day', 'reading', 'focused')).toBe(defaultScene)
  })

  it('should reject an unknown scene identifier combination', () => {
    expect(() => getPScene('dawn' as never, 'reading', 'focused')).toThrow(
      'Missing focus room scene: dawn-reading-focused',
    )
  })

  it('should keep every scene definition independently addressable', () => {
    for (const scene of FOCUS_ROOM_SCENES) {
      expect(getPSceneLayer(scene.id).id).toContain(scene.id)
      expect(getPScene(scene.time, scene.activity, scene.gaze)).toBe(scene)
    }

    const definitions = FOCUS_ROOM_SCENES.map((scene) => getPSceneLayer(scene.id))

    expect(new Set(definitions).size).toBe(definitions.length)
  })

  it('should replace every scene in the scribble dataset', () => {
    const preparedScenes = [
      {
        background: 'day-reading-focused-scribble-background',
        head: 'day-focused-scribble-head',
        scene: getPScene('day', 'reading', 'focused'),
      },
      {
        background: 'day-reading-focused-scribble-background',
        head: 'day-user-scribble-head',
        scene: getPScene('day', 'reading', 'user'),
      },
      {
        background: 'day-typing-focused-scribble-background',
        head: 'day-focused-scribble-head',
        scene: getPScene('day', 'typing', 'focused'),
      },
      {
        background: 'day-typing-focused-scribble-background',
        head: 'day-user-scribble-head',
        scene: getPScene('day', 'typing', 'user'),
      },
      {
        background: 'day-writing-focused-scribble-background',
        head: 'day-focused-scribble-head',
        scene: getPScene('day', 'writing', 'focused'),
      },
      {
        background: 'day-writing-focused-scribble-background',
        head: 'day-user-scribble-head',
        scene: getPScene('day', 'writing', 'user'),
      },
      {
        background: 'night-reading-focused-scribble-background',
        head: 'day-focused-scribble-head',
        scene: getPScene('night', 'reading', 'focused'),
      },
      {
        background: 'night-reading-focused-scribble-background',
        head: 'day-user-scribble-head',
        scene: getPScene('night', 'reading', 'user'),
      },
      {
        background: 'night-typing-focused-scribble-background',
        head: 'day-focused-scribble-head',
        scene: getPScene('night', 'typing', 'focused'),
      },
      {
        background: 'night-typing-focused-scribble-background',
        head: 'day-user-scribble-head',
        scene: getPScene('night', 'typing', 'user'),
      },
      {
        background: 'night-writing-focused-scribble-background',
        head: 'day-focused-scribble-head',
        scene: getPScene('night', 'writing', 'focused'),
      },
      {
        background: 'night-writing-focused-scribble-background',
        head: 'day-user-scribble-head',
        scene: getPScene('night', 'writing', 'user'),
      },
    ]

    expect(preparedScenes).toHaveLength(FOCUS_ROOM_SCENES.length)

    for (const {background, head, scene} of preparedScenes) {
      const layerScene = getPSceneLayer(scene.id, 'scribble')
      const backgroundLayer = layerScene.layers.find((layer) => layer.id === 'background')
      const headLayer = layerScene.layers.find((layer) => layer.id === 'head')

      expect(layerScene.id).toBe(`scribble-${scene.id}-layers`)
      expect(backgroundLayer).toMatchObject({
        id: 'background',
        source: expect.stringContaining(background),
      })
      expect(headLayer).toMatchObject({
        attachmentId: 'eyes',
        channel: FOCUS_ROOM_PREVIEW_CHANNELS.head,
        id: 'head',
        motion: {
          center: {x: 1060, y: 425},
          degrees: 0.5,
          kind: 'pivot-rotation',
          travel: {maximumSeconds: 2.4, minimumSeconds: 1.5},
        },
        position: {x: 809, y: 127},
        source: expect.stringContaining(head),
      })
    }
  })

  it('should provide a dedicated depth map for every scene style', () => {
    for (const scene of FOCUS_ROOM_SCENES) {
      const gazeName = scene.gaze === 'focused' ? 'focused' : 'user-gaze'
      const scribbleDepthName = `${scene.time}-${scene.activity}-${gazeName}-scribble`

      expect(scene.depthSources.original).toContain('/depth/')
      expect(scene.depthSources.original).not.toContain('scribble')
      expect(scene.depthSources.scribble).toContain('/depth/')
      expect(scene.depthSources.scribble).toContain(scribbleDepthName)
      expect(scene.depthSources.scribble).not.toBe(scene.depthSources.original)
    }
  })

  it('should share six full-head mouth stages across every scribble user-facing scene', () => {
    const expectedMouthIds = [
      'mouth-rest',
      'mouth-closed',
      'mouth-open',
      'mouth-wide',
      'mouth-round',
      'mouth-narrow',
    ]

    for (const scene of FOCUS_ROOM_SCENES) {
      const mouthLayers = getPSceneLayer(scene.id, 'scribble').layers.filter((layer) =>
        layer.id.startsWith('mouth-'),
      )

      if (scene.gaze === 'focused') {
        expect(mouthLayers).toEqual([])
      } else {
        expect(mouthLayers.map((layer) => layer.id).sort()).toEqual(expectedMouthIds.toSorted())
        expect(
          mouthLayers.every(
            (layer) =>
              layer.parentAttachmentId === 'eyes' &&
              layer.position?.x === 0 &&
              layer.position?.y === 0 &&
              layer.source.includes('mouths/day-user-scribble/') &&
              layer.visible === false,
          ),
        ).toBe(true)
      }
    }
  })

  it('should animate three shape-changing steam lines only in scribble scenes', () => {
    for (const scene of FOCUS_ROOM_SCENES) {
      const originalSteamLayers = getPSceneLayer(scene.id).layers.filter((layer) =>
        layer.id.startsWith('scribble-steam-'),
      )
      const scribbleSteamLayers = getPSceneLayer(scene.id, 'scribble').layers.filter((layer) =>
        layer.id.startsWith('scribble-steam-'),
      )

      expect(originalSteamLayers).toEqual([])
      expect(scribbleSteamLayers).toHaveLength(12)
      expect(new Set(scribbleSteamLayers.map((layer) => layer.id.split('-')[2])).size).toBe(3)
      expect(new Set(scribbleSteamLayers.map((layer) => layer.source)).size).toBe(4)
      expect(
        scribbleSteamLayers.every(
          (layer) =>
            layer.source.includes('steam/scribble/') &&
            layer.source.endsWith('.webp') &&
            layer.motions?.some((motion) => motion.kind === 'looping-translation') === true &&
            layer.motions.some((motion) => motion.kind === 'visibility-cycle'),
        ),
      ).toBe(true)
    }
  })

  it('should use true separated structural layers in every preview', () => {
    for (const scene of FOCUS_ROOM_SCENES) {
      const layerScene = getPSceneReviewLayer(scene.id)
      const structuralLayers = layerScene.layers.filter((layer) => !layer.id.startsWith('mouth-'))
      const expectedStructuralLayerCount =
        scene.id === 'night-reading-focused' ? 36 : scene.time === 'night' ? 13 : 8

      expect(structuralLayers).toHaveLength(expectedStructuralLayerCount)
      expect(layerScene.layers.map((layer) => layer.id)).toContain('head')
      expect(
        layerScene.layers.filter((layer) => layer.channel === FOCUS_ROOM_PREVIEW_CHANNELS.hands),
      ).toHaveLength(2)
      expect(
        layerScene.layers.every(
          (layer) =>
            (layer.id === 'background' || layer.motion?.kind !== 'pixel-oscillation') &&
            layer.motions === undefined,
        ),
      ).toBe(true)
    }
  })

  it('should breathe through every background without moving structural layers', () => {
    for (const scene of FOCUS_ROOM_SCENES) {
      const layers = getPSceneLayer(scene.id).layers
      const backgroundLayer = layers.find((layer) => layer.id === 'background')

      expect(backgroundLayer?.motion).toMatchObject({
        effects: [
          {
            distance: {x: 0, y: -3},
            kind: 'masked-pixel-push',
            maskSource: expect.stringContaining('breathing-mask'),
          },
        ],
        kind: 'pixel-oscillation',
        travel: {maximumSeconds: 2.5, minimumSeconds: 2.2},
      })
      expect(
        layers
          .filter((layer) => layer.id !== 'background')
          .every((layer) => layer.motion?.kind !== 'pixel-oscillation'),
      ).toBe(true)
    }
  })

  it('should move hair in every scene with the matching gaze mask', () => {
    for (const scene of FOCUS_ROOM_SCENES) {
      const headLayer = getPSceneLayer(scene.id).layers.find((layer) => layer.id === 'head')
      const hairMotion =
        headLayer?.motion?.kind === 'pivot-rotation' ? headLayer.motion.pixelPush : undefined
      const expectedMaskDirectory =
        scene.gaze === 'focused' ? 'day-writing-focused' : `${scene.time}-reading-user`

      expect(hairMotion).toMatchObject([
        {
          distance: {x: -4, y: 1.25},
          kind: 'masked-pixel-push',
          maskSource: expect.stringContaining(`${expectedMaskDirectory}/hair-tips-mask`),
        },
      ])
    }
  })

  it('should scroll the shared panorama behind every original day window mask', () => {
    for (const scene of FOCUS_ROOM_SCENES.filter((scene) => scene.time === 'day')) {
      const layers = getPSceneLayer(scene.id).layers
      const skyLayers = layers.filter((layer) => layer.id.startsWith('day-sky-'))

      expect(skyLayers.map((layer) => layer.id)).toEqual([
        'day-sky-panorama',
        'day-sky-cloud-overlay',
      ])
      expect(
        skyLayers.every(
          (layer) =>
            layer.maskSource?.includes('sky-mask-feathered') === true &&
            layer.motion?.kind === 'looping-translation' &&
            layer.motion.from.x === -4248 &&
            layer.motion.from.y === 0 &&
            layer.motion.to.x === 0 &&
            layer.motion.to.y === 0 &&
            layer.repeat === 'horizontal',
        ),
      ).toBe(true)
      expect(skyLayers[0]?.motion?.travel).toEqual({
        maximumSeconds: 1980,
        minimumSeconds: 1620,
      })
      expect(skyLayers[1]).toMatchObject({
        motion: {
          travel: {maximumSeconds: 1380, minimumSeconds: 1020},
        },
        opacity: 0.18,
        source: expect.stringContaining('cloud-overlay'),
      })
    }

    for (const scene of FOCUS_ROOM_SCENES.filter((scene) => scene.time === 'night')) {
      expect(getPSceneLayer(scene.id).layers.some((layer) => layer.id.startsWith('day-sky-'))).toBe(
        false,
      )
    }
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

  it('should provide every base mouth independently from the mouthless head', () => {
    const nightOnlyTransitionIds = new Set([
      'mouth-transition-open-wide-early',
      'mouth-transition-open-wide-late',
    ])
    const dayUserScenes = FOCUS_ROOM_SCENES.filter(
      (scene) => scene.gaze === 'user' && scene.time === 'day',
    )
    const nightUserScenes = FOCUS_ROOM_SCENES.filter(
      (scene) => scene.gaze === 'user' && scene.time === 'night',
    )

    expect(dayUserScenes).toHaveLength(3)
    expect(
      dayUserScenes.every((scene) => {
        const mouthLayers = getPSceneLayer(scene.id).layers.filter((layer) =>
          layer.id.startsWith('mouth-'),
        )
        const transitionLayers = mouthLayers.filter((layer) =>
          layer.id.startsWith('mouth-transition-'),
        )

        return (
          mouthLayers.length - transitionLayers.length === 6 &&
          transitionLayers.length ===
            P_MOUTH_TRANSITION_STAGES.length - nightOnlyTransitionIds.size &&
          transitionLayers.every((layer) => !nightOnlyTransitionIds.has(layer.id))
        )
      }),
    ).toBe(true)
    expect(nightUserScenes).toHaveLength(3)
    expect(
      nightUserScenes.every((scene) => {
        const mouthLayers = getPSceneLayer(scene.id).layers.filter((layer) =>
          layer.id.startsWith('mouth-'),
        )
        const transitionLayers = mouthLayers.filter((layer) =>
          layer.id.startsWith('mouth-transition-'),
        )

        return (
          mouthLayers.length - transitionLayers.length === 6 &&
          transitionLayers.length === P_MOUTH_TRANSITION_STAGES.length &&
          [...nightOnlyTransitionIds].every((id) =>
            transitionLayers.some((layer) => layer.id === id),
          ) &&
          mouthLayers.some((layer) => layer.id === 'mouth-rest')
        )
      }),
    ).toBe(true)
  })

  it('should move each configured user-facing jaw while keeping every mouth layer untouched', () => {
    for (const scene of FOCUS_ROOM_SCENES) {
      const layerScene = getPSceneLayer(scene.id)
      const head = layerScene.layers.find((layer) => layer.id === 'head')
      const mouthLayers = layerScene.layers.filter((layer) => layer.id.startsWith('mouth-'))

      expect(mouthLayers.every((layer) => layer.statePixelPush === undefined)).toBe(true)

      if (scene.gaze === 'user') {
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

  it('should share the mouthless reading head across every day user-facing scene', () => {
    const dayUserHeadSources = FOCUS_ROOM_SCENES.filter(
      (scene) => scene.gaze === 'user' && scene.time === 'day',
    ).map((scene) => getPSceneLayer(scene.id).layers.find((layer) => layer.id === 'head')?.source)

    expect(dayUserHeadSources).toHaveLength(3)
    expect(new Set(dayUserHeadSources).size).toBe(1)
    expect(dayUserHeadSources[0]).toContain('day-reading-user')
  })

  it('should share the reading head across every night focused scene', () => {
    const nightFocusedHeadSources = FOCUS_ROOM_SCENES.filter(
      (scene) => scene.gaze === 'focused' && scene.time === 'night',
    ).map((scene) => getPSceneLayer(scene.id).layers.find((layer) => layer.id === 'head')?.source)

    expect(nightFocusedHeadSources).toHaveLength(3)
    expect(new Set(nightFocusedHeadSources).size).toBe(1)
  })

  it('should omit review-only reference imagery from every runtime scene', () => {
    for (const scene of FOCUS_ROOM_SCENES) {
      expect(getPSceneLayer(scene.id).layers.some((layer) => layer.id === 'reference')).toBe(false)
    }
  })

  it('should expose the complete review panel channels for every preview', () => {
    for (const scene of FOCUS_ROOM_SCENES) {
      const channels = getPSceneReviewLayer(scene.id).layers.flatMap((layer) => [
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
