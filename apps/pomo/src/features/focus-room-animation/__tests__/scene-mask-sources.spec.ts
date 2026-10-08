import {describe, expect, it} from 'vitest'
import type {PixiLayerSceneDefinition, PixiScenePushEffect} from '../layer-scene-definition'
import {getSceneMaskSources} from '../scene-mask-sources'

const createDefinition = (
  overrides: Partial<PixiLayerSceneDefinition> = {},
): PixiLayerSceneDefinition => ({
  background: '#fff',
  height: 100,
  id: 'scene',
  layers: [],
  width: 200,
  ...overrides,
})

const maskedPush = (maskSource: string): PixiScenePushEffect => ({
  distance: {x: 1, y: 1},
  kind: 'masked-pixel-push',
  maskSource,
})

const unmaskedPush: PixiScenePushEffect = {
  distance: {x: 1, y: 1},
  featherPixels: 1,
  kind: 'pixel-push',
  region: {height: 1, width: 1, x: 0, y: 0},
}

describe('getSceneMaskSources', () => {
  it('should return no masks for an empty scene or unmasked layers', () => {
    expect(getSceneMaskSources(createDefinition())).toEqual([])
    expect(
      getSceneMaskSources(
        createDefinition({
          effects: [],
          layers: [
            {id: 'static', source: '/static.webp'},
            {
              id: 'animated',
              motions: [
                {
                  effects: [unmaskedPush],
                  kind: 'pixel-oscillation',
                  travel: {maximumSeconds: 1, minimumSeconds: 1},
                },
                {
                  distance: {x: 1, y: 1},
                  kind: 'translation',
                  travel: {maximumSeconds: 1, minimumSeconds: 1},
                },
              ],
              source: '/animated.webp',
              statePixelPush: {channel: 'state', effect: unmaskedPush},
            },
          ],
        }),
      ),
    ).toEqual([])
  })

  it('should keep first occurrence order across layers, state, motions, and scene effects', () => {
    const definition = createDefinition({
      effects: [
        {id: 'duplicate', kind: 'falling-streaks', maskSource: '/state.png'},
        {id: 'scene', kind: 'falling-flakes', maskSource: '/scene.png'},
      ],
      layers: [
        {
          id: 'first',
          maskSource: '/layer.png',
          motions: [
            {
              effects: [unmaskedPush, maskedPush('/motion.png'), maskedPush('/layer.png')],
              kind: 'pixel-oscillation',
              travel: {maximumSeconds: 1, minimumSeconds: 1},
            },
            {
              center: {x: 0, y: 0},
              degrees: 1,
              kind: 'pivot-rotation',
              pixelPush: [maskedPush('/pivot.png'), maskedPush('/motion.png')],
              travel: {maximumSeconds: 1, minimumSeconds: 1},
            },
          ],
          source: '/first.webp',
          statePixelPush: {channel: 'state', effect: maskedPush('/state.png')},
        },
        {
          id: 'second',
          maskSource: '/motion.png',
          motion: {
            effects: [maskedPush('/second.png'), maskedPush('/pivot.png')],
            kind: 'pixel-oscillation',
            travel: {maximumSeconds: 1, minimumSeconds: 1},
          },
          source: '/second.webp',
          statePixelPush: {channel: 'state', effect: maskedPush('/layer.png')},
        },
      ],
    })

    expect(getSceneMaskSources(definition)).toEqual([
      '/layer.png',
      '/state.png',
      '/motion.png',
      '/pivot.png',
      '/second.png',
      '/scene.png',
    ])
  })

  it('should preserve an empty source while deduplicating it across every mask path', () => {
    expect(
      getSceneMaskSources(
        createDefinition({
          effects: [{id: 'scene', kind: 'falling-streaks', maskSource: ''}],
          layers: [
            {
              id: 'layer',
              maskSource: '',
              motion: {
                effects: [maskedPush('')],
                kind: 'pixel-oscillation',
                travel: {maximumSeconds: 1, minimumSeconds: 1},
              },
              source: '/layer.webp',
              statePixelPush: {channel: 'state', effect: maskedPush('')},
            },
          ],
        }),
      ),
    ).toEqual([''])
  })

  it('should leave frozen input intact and return an independent result on each call', () => {
    const layer = Object.freeze({id: 'layer', maskSource: '/mask.png', source: '/layer.webp'})
    const layers = Object.freeze([layer])
    const definition = Object.freeze(createDefinition({layers}))

    const first = getSceneMaskSources(definition)
    const second = getSceneMaskSources(definition)

    expect(first).toEqual(['/mask.png'])
    expect(second).toEqual(first)
    expect(second).not.toBe(first)
    expect(definition.layers).toBe(layers)
    expect(layers).toEqual([layer])
  })
})
