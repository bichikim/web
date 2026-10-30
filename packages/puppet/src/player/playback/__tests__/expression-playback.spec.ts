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

test('should use Cubism sine easing while preserving native expression timing', () => {
  const cubism: PuppetExpression = {...smile, composition: 'cubism'}
  const imported = createExpressionPlayback([cubism])
  imported.set(cubism.id)
  imported.advance(1 / 3)
  const native = createExpressionPlayback([smile])
  native.set(smile.id)
  native.advance(1 / 3)
  expect(imported.layers()[0]?.weight).toBeCloseTo(0.25)
  expect(native.layers()[0]?.weight).toBeCloseTo(4 / 27)
})

test('should retain the SDK expression blend when a fade is interrupted', () => {
  const first: PuppetExpression = {
    composition: 'cubism',
    fadeInTime: 0.5,
    fadeOutTime: 0.5,
    id: 'first',
    parameters: [{blend: 'add', parameterId: 'eye', value: -1}],
  }
  const next: PuppetExpression = {...first, id: 'next'}
  const playback = createExpressionPlayback([first, next])
  const parameters = [parameter('eye', 1)]
  playback.set('first')
  playback.advance(0.2)
  playback.set('next')
  playback.advance(0.15)
  expect(applyExpressionLayers(parameters, {eye: 1}, playback.layers()).eye).toBeCloseTo(0)
  playback.advance(0.35)
  expect(playback.layers()).toHaveLength(1)
  expect(applyExpressionLayers(parameters, {eye: 1}, playback.layers()).eye).toBeCloseTo(0)
  playback.set(undefined)
  playback.advance(0.25)
  expect(applyExpressionLayers(parameters, {eye: 1}, playback.layers()).eye).toBeCloseTo(0.5)
  playback.advance(0.25)
  expect(playback.layers()).toEqual([])
})

test('should release an unfinished Cubism expression from its current weight', () => {
  const expression: PuppetExpression = {...smile, composition: 'cubism'}
  const playback = createExpressionPlayback([expression])
  playback.set(expression.id)
  playback.advance(0.2)
  const before = playback.layers()[0]!.weight
  playback.set(undefined)
  playback.advance(0.05)
  expect(playback.layers()[0]!.weight).toBeLessThan(before)
})

test('should replace and clear zero-duration Cubism expressions synchronously', () => {
  const first: PuppetExpression = {...smile, composition: 'cubism', fadeInTime: 0, fadeOutTime: 0}
  const next: PuppetExpression = {...first, id: 'next'}
  const playback = createExpressionPlayback([first, next])
  playback.set(first.id)
  playback.set(next.id)
  expect(playback.layers().map((layer) => layer.expression.id)).toEqual(['next'])
  expect(playback.isAnimating()).toBe(false)
  playback.set(undefined)
  expect(playback.layers()).toEqual([])
})

test('should preserve the current value when reselecting a Cubism expression during release', () => {
  const expression: PuppetExpression = {...smile, composition: 'cubism'}
  const playback = createExpressionPlayback([expression])
  playback.set(expression.id)
  playback.advance(0.2)
  playback.set(undefined)
  playback.advance(0.05)
  const before = applyExpressionLayers([parameter('mouth')], {}, playback.layers()).mouth
  playback.set(expression.id)
  expect(applyExpressionLayers([parameter('mouth')], {}, playback.layers()).mouth).toBeCloseTo(
    before!,
  )
})

test('should release previous Cubism expressions when the active preset is removed', () => {
  const first: PuppetExpression = {...smile, composition: 'cubism', fadeOutTime: 1}
  const next: PuppetExpression = {...first, id: 'next'}
  const playback = createExpressionPlayback([first, next])
  playback.set(first.id)
  playback.advance(0.2)
  playback.set(next.id)
  playback.advance(0.1)
  playback.update([first])
  const before = playback.layers()[0]!.weight
  playback.advance(0.1)
  expect(playback.layers()[0]!.weight).toBeLessThan(before)
  playback.advance(1)
  expect(playback.layers()).toEqual([])
  expect(playback.isAnimating()).toBe(false)
})

describe('independent expressions', () => {
  const controller: PuppetExpression = {
    composition: 'cubism',
    fadeInTime: 0,
    fadeOutTime: 0,
    id: 'controller',
    parameters: [{blend: 'add', parameterId: 'held', value: 1}],
  }
  const left: PuppetExpression = {
    composition: 'cubism',
    fadeInTime: 1,
    fadeOutTime: 1,
    id: 'left',
    parameters: [{blend: 'add', parameterId: 'left', value: 1}],
  }
  test('should retain a held expression while another fades in and out independently', () => {
    const playback = createExpressionPlayback([controller, left])
    playback.setMany(['controller'])
    playback.setMany(['controller', 'left', 'left'])
    playback.advance(0.5)
    const parameters = [parameter('held'), parameter('left')]
    const values = applyExpressionLayers(parameters, {}, playback.layers())
    expect(values.held).toBe(1)
    expect(values.left).toBeCloseTo(0.5)
    playback.setMany(['controller'])
    playback.advance(0.5)
    expect(applyExpressionLayers(parameters, {}, playback.layers())).toEqual({held: 1, left: 0})
    expect(playback.layers().map((layer) => layer.expression.id)).toEqual(['controller'])
    expect(playback.setMany(['missing'])).toBe(false)
    expect(playback.layers().map((layer) => layer.expression.id)).toEqual(['controller'])
    playback.setMany([])
    expect(playback.layers()).toEqual([])
  })
  test('should reverse a partial release and remove deleted expressions', () => {
    const playback = createExpressionPlayback([left])
    playback.setMany(['left'])
    playback.advance(0.5)
    playback.setMany([])
    playback.advance(0.25)
    playback.setMany(['left'])
    expect(playback.layers()[0]?.weight).toBeCloseTo(0.1464466094)
    playback.advance(1)
    expect(playback.layers()[0]?.weight).toBe(1)
    playback.update([])
    expect(playback.layers()).toEqual([])
  })
})

test('should give a reactivated independent overwrite the latest activation priority', () => {
  const expression = (id: string, value: number): PuppetExpression => ({
    fadeInTime: 0,
    fadeOutTime: 1,
    id,
    parameters: [{blend: 'overwrite', parameterId: 'p', value}],
  })
  const playback = createExpressionPlayback([expression('first', 2), expression('second', 4)])
  playback.setMany(['first', 'second'])
  playback.setMany(['second'])
  playback.advance(0.25)
  playback.setMany(['second', 'first'])
  expect(applyExpressionLayers([parameter('p')], {}, playback.layers()).p).toBe(2)
})

describe('expression API transitions', () => {
  const expression: PuppetExpression = {...smile, composition: 'cubism'}
  test('should fade stacked expressions when the single-expression API clears them', () => {
    const playback = createExpressionPlayback([expression])
    playback.setMany([expression.id])
    playback.advance(1)
    playback.set(undefined)
    expect(playback.layers()[0]?.weight).toBe(1)
    playback.advance(0.25)
    expect(playback.layers()[0]?.weight).toBeCloseTo(0.5)
    playback.advance(0.25)
    expect(playback.layers()).toEqual([])
  })
  test('should fade a single expression when the independent API clears it', () => {
    const playback = createExpressionPlayback([expression])
    playback.set(expression.id)
    playback.advance(1)
    playback.setMany([])
    expect(playback.layers()[0]?.weight).toBe(1)
    playback.advance(0.25)
    expect(playback.layers()[0]?.weight).toBeCloseTo(0.5)
  })
  test.each(['single-to-stack', 'stack-to-single'] as const)(
    'should preserve outgoing contributions during %s replacement',
    (direction) => {
      const next: PuppetExpression = {...expression, id: 'next', parameters: []}
      const playback = createExpressionPlayback([expression, next])
      if (direction === 'single-to-stack') {
        playback.set(expression.id)
      } else {
        playback.setMany([expression.id])
      }
      playback.advance(1)
      const parameters = [parameter('mouth')]
      if (direction === 'single-to-stack') {
        playback.setMany([next.id])
      } else {
        playback.set(next.id)
      }
      expect(applyExpressionLayers(parameters, {}, playback.layers()).mouth).toBe(2)
      playback.advance(0.25)
      expect(applyExpressionLayers(parameters, {}, playback.layers()).mouth).toBeCloseTo(1)
      playback.advance(1)
      expect(applyExpressionLayers(parameters, {}, playback.layers()).mouth).toBe(0)
    },
  )
})
