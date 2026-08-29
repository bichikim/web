import {describe, expect, it} from 'vitest'

import type {PixiLayerSceneDefinition, PSceneId} from '../../focus-room-animation'
import {applyWeatherSceneLayer, type WeatherSceneCondition} from '..'

const createScene = (
  includeHead = true,
  id = 'day-reading-focused-layers',
): PixiLayerSceneDefinition => ({
  background: '#000000',
  height: 941,
  id,
  layers: [
    {id: 'background', source: '/background.webp'},
    ...(includeHead ? [{id: 'head', source: '/head.webp'}] : []),
    {id: 'left-hand', source: '/left-hand.webp'},
  ],
  width: 1672,
})

describe('applyWeatherSceneLayer', () => {
  it.each([
    ['day-reading-focused', 'clear', 'day-clear.jpg'],
    ['day-reading-focused', 'cloudy', 'day-cloudy.jpg'],
    ['day-reading-focused', 'overcast', 'day-overcast.jpg'],
    ['day-reading-focused', 'rain', 'day-rain.jpg'],
    ['day-reading-focused', 'snow', 'day-snow.jpg'],
    ['night-reading-focused', 'clear', 'night-clear.jpg'],
    ['night-reading-focused', 'cloudy', 'night-cloudy.jpg'],
    ['night-reading-focused', 'overcast', 'night-overcast.jpg'],
    ['night-reading-focused', 'rain', 'night-rain.jpg'],
    ['night-reading-focused', 'snow', 'night-snow.jpg'],
  ] satisfies ReadonlyArray<[PSceneId, WeatherSceneCondition, string]>)(
    'should insert the %s %s view before character layers',
    (sceneId, condition, sourceName) => {
      const scene = createScene(true, `${sceneId}-layers`)
      const result = applyWeatherSceneLayer(scene, sceneId, 'original', condition)

      expect(result).not.toBe(scene)
      expect(result.id).toBe(`${sceneId}-layers-weather-${condition}`)
      expect(result.layers.map((layer) => layer.id)).toEqual([
        'background',
        `weather-${condition}`,
        'head',
        'left-hand',
      ])
      expect(result.layers[1]).toMatchObject({
        maskSource: expect.stringContaining('day-reading-focused-mask.png'),
        source: expect.stringContaining(sourceName),
      })
      expect(result.effects).toEqual(
        condition === 'rain'
          ? [
              {
                beforeLayerId: 'head',
                id: 'weather-rain',
                kind: 'falling-streaks',
                maskSource: expect.stringContaining('precipitation-effect-mask.png'),
                opacity: sceneId === 'night-reading-focused' ? 0.4 : 1,
              },
            ]
          : condition === 'snow'
            ? [
                {
                  beforeLayerId: 'head',
                  id: 'weather-snow',
                  kind: 'falling-flakes',
                  maskSource: expect.stringContaining('precipitation-effect-mask.png'),
                  opacity: sceneId === 'night-reading-focused' ? 0.4 : 1,
                },
              ]
            : [],
      )
    },
  )

  it.each([
    ['day-reading-focused', 'scribble', 'rain'],
    ['day-typing-focused', 'original', 'rain'],
  ] satisfies ReadonlyArray<[PSceneId, 'original' | 'scribble', WeatherSceneCondition]>)(
    'should preserve an unsupported scene for %s %s %s',
    (sceneId, sceneStyle, condition) => {
      const scene = createScene()

      expect(applyWeatherSceneLayer(scene, sceneId, sceneStyle, condition)).toBe(scene)
    },
  )

  it('should append the weather view when a scene has no character layer', () => {
    const result = applyWeatherSceneLayer(
      createScene(false),
      'day-reading-focused',
      'original',
      'rain',
    )

    expect(result.layers.map((layer) => layer.id)).toEqual([
      'background',
      'left-hand',
      'weather-rain',
    ])
    expect(result.effects).toMatchObject([{beforeLayerId: undefined}])
  })

  it('should keep the clear view behind ambient scene layers', () => {
    const scene: PixiLayerSceneDefinition = {
      ...createScene(),
      layers: [
        {id: 'background', source: '/background.webp'},
        {id: 'sky-star-1', source: '/star.webp'},
        {id: 'head', source: '/head.webp'},
        {id: 'left-hand', source: '/left-hand.webp'},
      ],
    }

    const result = applyWeatherSceneLayer(scene, 'night-reading-focused', 'original', 'clear')

    expect(result.layers.map((layer) => layer.id)).toEqual([
      'background',
      'weather-clear',
      'sky-star-1',
      'head',
      'left-hand',
    ])
  })

  it('should prepend a clear view when the scene has no background layer', () => {
    const scene: PixiLayerSceneDefinition = {
      ...createScene(),
      layers: [
        {id: 'head', source: '/head.webp'},
        {id: 'left-hand', source: '/left-hand.webp'},
      ],
    }

    const result = applyWeatherSceneLayer(scene, 'day-reading-focused', 'original', 'clear')

    expect(result.layers.map((layer) => layer.id)).toEqual(['weather-clear', 'head', 'left-hand'])
  })
})
