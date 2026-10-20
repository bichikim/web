import {describe, expect, test} from 'vitest'

import type {PuppetExpression, PuppetParameter} from '../../document'
import {applyExpressionLayers, createExpressionPlayback} from '../expression-playback'

const parameter = (id: string, defaultValue = 0): PuppetParameter => ({
  defaultValue,
  id,
  maximum: 10,
  minimum: -10,
  name: id,
})

const smile: PuppetExpression = {
  fadeInTime: 1,
  fadeOutTime: 0.5,
  id: 'smile',
  parameters: [
    {blend: 'add', parameterId: 'mouth', value: 2},
    {blend: 'multiply', parameterId: 'eye', value: 0.5},
    {blend: 'overwrite', parameterId: 'brow', value: 4},
  ],
}

describe('applyExpressionLayers', () => {
  test('should add, multiply and overwrite by layer weight', () => {
    const parameters = [parameter('mouth'), parameter('eye'), parameter('brow'), parameter('other')]
    const values = {brow: 2, eye: 4, mouth: 1, other: 3}

    expect(applyExpressionLayers(parameters, values, [{expression: smile, weight: 1}])).toEqual({
      brow: 4,
      eye: 2,
      mouth: 3,
      other: 3,
    })
    expect(applyExpressionLayers(parameters, values, [{expression: smile, weight: 0.5}])).toEqual({
      brow: 3,
      eye: 3,
      mouth: 2,
      other: 3,
    })
    expect(applyExpressionLayers(parameters, values, [])).toBe(values)
  })
})

describe('createExpressionPlayback', () => {
  test('should fade in, hold, cross-fade and release expressions', () => {
    const wink: PuppetExpression = {fadeInTime: 0, id: 'wink', parameters: []}
    const playback = createExpressionPlayback([smile, wink])

    expect(playback.set('missing')).toBe(false)
    expect(playback.set('smile')).toBe(true)
    expect(playback.layers()).toEqual([{expression: smile, weight: 0}])
    playback.advance(0.5)
    expect(playback.layers()[0]?.weight).toBe(0.5)
    expect(playback.isAnimating()).toBe(true)
    playback.advance(1)
    expect(playback.layers()[0]?.weight).toBe(1)
    expect(playback.isAnimating()).toBe(false)
    expect(playback.current()).toBe('smile')

    expect(playback.set('wink')).toBe(true)
    playback.advance(0.25)
    expect(playback.layers().map((layer) => [layer.expression.id, layer.weight])).toEqual([
      ['smile', 0.5],
      ['wink', 1],
    ])
    playback.advance(0.25)
    expect(playback.layers().map((layer) => layer.expression.id)).toEqual(['wink'])

    playback.set(undefined)
    expect(playback.current()).toBeUndefined()
    playback.advance(1)
    expect(playback.layers()).toEqual([])
  })

  test('should drop expressions removed from the document', () => {
    const playback = createExpressionPlayback([smile])
    playback.set('smile')
    playback.update([])

    expect(playback.layers()).toEqual([])
    expect(playback.set('smile')).toBe(false)
  })
})

test('should apply zero-duration expression fades without waiting for another frame', () => {
  const expression: PuppetExpression = {...smile, fadeInTime: 0, fadeOutTime: 0}
  const playback = createExpressionPlayback([expression])
  playback.set(expression.id)
  expect(playback.layers()).toEqual([{expression, weight: 1}])
  expect(playback.isAnimating()).toBe(false)
  playback.set(undefined)
  expect(playback.layers()).toEqual([])
  expect(playback.isAnimating()).toBe(false)
})
