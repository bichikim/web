import {describe, expect, it} from 'vitest'

import type {PActivity, PixiLayerSceneDefinition, PTime} from '../../focus-room-animation'
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

const WEATHER_SCENES = [
  ['day', 'reading'],
  ['day', 'typing'],
  ['day', 'writing'],
  ['night', 'reading'],
  ['night', 'typing'],
  ['night', 'writing'],
] satisfies ReadonlyArray<readonly [PTime, PActivity]>

const WEATHER_CONDITIONS = ['clear', 'cloudy', 'overcast', 'rain', 'snow'] as const

const WEATHER_CASES = WEATHER_SCENES.flatMap(([time, activity]) =>
  WEATHER_CONDITIONS.map(
    (condition) =>
      [time, activity, condition, `${time}-${condition}.jpg`] as const satisfies readonly [
        PTime,
        PActivity,
        WeatherSceneCondition,
        string,
      ],
  ),
)

describe('applyWeatherSceneLayer', () => {
  it.each(WEATHER_CASES)(
    'should insert the %s %s %s view before character layers',
    (time, activity, condition, sourceName) => {
      const scene = createScene(true, `${time}-${activity}-layers`)
      const result = applyWeatherSceneLayer({
        activity,
        condition,
        scene,
        sceneStyle: 'original',
        time,
      })
      const maskPrefix = activity === 'typing' ? `${time}-${activity}` : activity
      const windowMaskName = `${maskPrefix}-mask.png`
      const precipitationMaskName = `${maskPrefix}-precipitation-effect-mask.png`

      expect(result).not.toBe(scene)
      expect(result.id).toBe(`${time}-${activity}-layers-weather-${condition}`)
      expect(result.layers.map((layer) => layer.id)).toEqual([
        'background',
        `weather-${condition}`,
        'head',
        'left-hand',
      ])
      expect(result.layers[1]).toMatchObject({
        maskSource: expect.stringContaining(windowMaskName),
        source: expect.stringContaining(sourceName),
      })
      expect(result.effects).toEqual(
        condition === 'rain'
          ? [
              {
                beforeLayerId: 'head',
                id: 'weather-rain',
                kind: 'falling-streaks',
                maskSource: expect.stringContaining(precipitationMaskName),
                opacity: time === 'night' ? 0.4 : 1,
              },
            ]
          : condition === 'snow'
            ? [
                {
                  beforeLayerId: 'head',
                  id: 'weather-snow',
                  kind: 'falling-flakes',
                  maskSource: expect.stringContaining(precipitationMaskName),
                  opacity: time === 'night' ? 0.4 : 1,
                },
              ]
            : [],
      )
    },
  )

  it.each([
    ['day', 'reading', 'scribble', 'rain'],
    ['night', 'writing', 'scribble', 'rain'],
  ] satisfies ReadonlyArray<
    readonly [PTime, PActivity, 'original' | 'scribble', WeatherSceneCondition]
  >)(
    'should preserve an unsupported style for %s %s %s %s',
    (time, activity, sceneStyle, condition) => {
      const scene = createScene()

      expect(applyWeatherSceneLayer({activity, condition, scene, sceneStyle, time})).toBe(scene)
    },
  )

  it('should append the weather view when a scene has no character layer', () => {
    const result = applyWeatherSceneLayer({
      activity: 'reading',
      condition: 'rain',
      scene: createScene(false),
      sceneStyle: 'original',
      time: 'day',
    })

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

    const result = applyWeatherSceneLayer({
      activity: 'reading',
      condition: 'clear',
      scene,
      sceneStyle: 'original',
      time: 'night',
    })

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

    const result = applyWeatherSceneLayer({
      activity: 'reading',
      condition: 'clear',
      scene,
      sceneStyle: 'original',
      time: 'day',
    })

    expect(result.layers.map((layer) => layer.id)).toEqual(['weather-clear', 'head', 'left-hand'])
  })
})
